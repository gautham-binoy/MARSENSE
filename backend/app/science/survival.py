"""Astronaut survival simulator: hourly mass/energy balance with configurable assumptions and scenarios.

EDUCATIONAL / RESEARCH MODEL. Not a certified life-support analysis. Every assumption is returned with the result.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np

SOL_HOURS = 24.66


@dataclass
class Assumptions:
    """Per-person consumption rates (NASA BVAD 2022 nominal values unless noted)."""

    o2_kg_per_day: float = 0.84
    o2_eva_multiplier: float = 1.6  # metabolic rate increase during EVA
    co2_kg_per_day: float = 1.04
    water_kg_per_day: float = 2.5  # drinking + food prep; hygiene water configurable below
    hygiene_water_kg_per_day: float = 1.0
    water_recycling_efficiency: float = 0.0  # 0 = open loop (conservative default for a surface sortie)
    food_kg_per_day: float = 0.62  # dry mass, ~2,500 kcal
    habitat_power_kw: float = 2.0  # baseline habitat / ECLSS load
    eva_suit_power_kwh_per_h: float = 0.3
    rover_kwh_per_km: float = 1.2  # pressurised rover order-of-magnitude
    solar_recharge_kwh_per_sol: float = 0.0  # set > 0 if a solar array is available
    eva_hours_per_day: float = 4.0
    rover_km_per_day: float = 0.0
    sources: list[str] = field(default_factory=lambda: [
        "NASA Baseline Values and Assumptions Document (BVAD) NASA/TP-2015-218570 Rev.2 (2022): O2 0.84 kg/CM-d, CO2 1.04 kg/CM-d, potable water 2.5 kg/CM-d, food 0.62 kg dry/CM-d",
        "EVA metabolic factor and suit power are MARSENSE engineering assumptions (configurable)",
    ])


@dataclass
class Supplies:
    crew: int = 2
    duration_days: float = 10.0
    oxygen_kg: float = 40.0
    water_kg: float = 120.0
    battery_kwh: float = 800.0
    co2_scrubber_capacity_kg: float = 40.0
    food_kg: float = 20.0
    emergency_reserve_fraction: float = 0.2  # fraction of each resource that should remain untouched
    return_journey_days: float = 1.0  # extra days of consumption that must be kept for the return


@dataclass
class Scenario:
    id: str = "normal"
    name: str = "Normal exploration"
    description: str = "Mission proceeds as planned."
    delay_days: float = 0.0  # extra days before return
    consumption_multiplier: float = 1.0  # e.g. 1.2 for hard physical work / stress
    scrubber_efficiency: float = 1.0  # 0.5 = half the scrubber capacity failed
    power_loss_fraction: float = 0.0  # fraction of battery lost (e.g. equipment failure)
    water_loss_fraction: float = 0.0  # leak
    extra_return_days: float = 0.0  # longer return journey
    eva_hours_override: float | None = None


SCENARIOS: dict[str, Scenario] = {
    s.id: s for s in [
        Scenario(),
        Scenario(id="extended", name="Extended exploration", description="Science team requests 3 more days on site.", delay_days=3.0),
        Scenario(id="delay", name="Unexpected delay", description="Dust storm grounds the crew for 5 sols; EVAs stop but habitat keeps running.", delay_days=5.0, eva_hours_override=0.0),
        Scenario(id="scrubber_failure", name="CO2 scrubber failure", description="Half of the CO2 scrubber capacity fails on day 2.", scrubber_efficiency=0.5),
        Scenario(id="power_failure", name="Power system fault", description="40% of battery capacity lost to a failed string; rover use continues.", power_loss_fraction=0.4),
        Scenario(id="long_return", name="Longer return journey", description="Return route blocked; detour adds 2 days of travel.", extra_return_days=2.0),
        Scenario(id="combined", name="Delay + leak", description="3-day delay plus a 15% water leak.", delay_days=3.0, water_loss_fraction=0.15),
    ]
}

RESOURCES = ["oxygen", "water", "power", "co2_scrubber", "food"]
LABELS = {"oxygen": "Oxygen (kg)", "water": "Water (kg)", "power": "Battery (kWh)", "co2_scrubber": "CO2 scrubber capacity (kg CO2)", "food": "Food (kg)"}


def simulate(sup: Supplies, a: Assumptions, sc: Scenario, step_h: float = 1.0) -> dict:
    total_days = sup.duration_days + sc.delay_days + sup.return_journey_days + sc.extra_return_days
    n = int(np.ceil(total_days * 24 / step_h)) + 1
    t_h = np.arange(n) * step_h
    t_d = t_h / 24.0
    eva_h_per_day = a.eva_hours_per_day if sc.eva_hours_override is None else sc.eva_hours_override
    eva_frac = np.clip(eva_h_per_day / 24.0, 0, 1)
    crew = sup.crew
    m = sc.consumption_multiplier
    # surface phase vs return phase (no EVA on return, rover driving instead)
    on_site = t_d <= (sup.duration_days + sc.delay_days)
    eva_now = np.where(on_site, eva_frac, 0.0)
    o2_rate = crew * a.o2_kg_per_day / 24.0 * m * (1 + eva_now * (a.o2_eva_multiplier - 1))
    co2_rate = crew * a.co2_kg_per_day / 24.0 * m * (1 + eva_now * (a.o2_eva_multiplier - 1))
    water_rate = crew * (a.water_kg_per_day + a.hygiene_water_kg_per_day) / 24.0 * m * (1 - a.water_recycling_efficiency)
    food_rate = crew * a.food_kg_per_day / 24.0 * m
    rover_km_h = np.where(on_site, a.rover_km_per_day, 2.0 * a.rover_km_per_day + 5.0) / 24.0  # return drives more
    power_rate = a.habitat_power_kw + crew * eva_now * a.eva_suit_power_kwh_per_h + rover_km_h * a.rover_kwh_per_km - a.solar_recharge_kwh_per_sol / SOL_HOURS

    def integrate(rate: np.ndarray, initial: float) -> np.ndarray:
        used = np.cumsum(rate * step_h) - rate[0] * step_h
        return initial - used

    start = {
        "oxygen": sup.oxygen_kg,
        "water": sup.water_kg * (1 - sc.water_loss_fraction),
        "power": sup.battery_kwh * (1 - sc.power_loss_fraction),
        "co2_scrubber": sup.co2_scrubber_capacity_kg * sc.scrubber_efficiency,
        "food": sup.food_kg,
    }
    rates = {"oxygen": o2_rate, "water": np.full(n, water_rate), "power": power_rate, "co2_scrubber": co2_rate, "food": np.full(n, food_rate)}
    series = {k: integrate(rates[k], start[k]) for k in RESOURCES}
    reserve = {k: start[k] * sup.emergency_reserve_fraction for k in RESOURCES}
    warnings, summary = [], {}
    for k in RESOURCES:
        s = series[k]
        depleted_idx = np.argmax(s <= 0) if (s <= 0).any() else None
        reserve_idx = np.argmax(s <= reserve[k]) if (s <= reserve[k]).any() else None
        avg_rate = float(np.mean(rates[k]))
        mission_end = total_days
        remaining = float(s[-1])
        days_to_depletion = float(t_d[depleted_idx]) if depleted_idx is not None else (float(start[k] / (avg_rate * 24)) if avg_rate > 0 else None)
        status = "ok"
        if depleted_idx is not None:
            status = "critical"
            warnings.append({"resource": k, "severity": "critical", "day": round(float(t_d[depleted_idx]), 1),
                             "message": f"{LABELS[k]} fully depleted on day {t_d[depleted_idx]:.1f} - before mission end (day {mission_end:.1f})."})
        elif reserve_idx is not None:
            status = "warning"
            warnings.append({"resource": k, "severity": "warning", "day": round(float(t_d[reserve_idx]), 1),
                             "message": f"{LABELS[k]} drops into the {sup.emergency_reserve_fraction*100:.0f}% emergency reserve on day {t_d[reserve_idx]:.1f}."})
        summary[k] = {
            "label": LABELS[k], "initial": round(start[k], 2), "remaining_at_end": round(remaining, 2),
            "consumed": round(start[k] - remaining, 2), "reserve_threshold": round(reserve[k], 2),
            "mean_rate_per_day": round(avg_rate * 24, 3), "days_to_depletion": round(days_to_depletion, 1) if days_to_depletion is not None else None,
            "margin_days": round(days_to_depletion - mission_end, 1) if days_to_depletion is not None else None,
            "status": status,
        }
    # recommended supply to finish with reserve intact
    recommended = {k: round((start[k] - float(series[k][-1])) / max(1e-6, 1 - sup.emergency_reserve_fraction), 1) for k in RESOURCES}
    stride = max(1, n // 300)
    timeline = [{"day": round(float(t_d[i]), 2), **{k: round(float(series[k][i]), 2) for k in RESOURCES}} for i in range(0, n, stride)]
    if (n - 1) % stride:
        timeline.append({"day": round(float(t_d[-1]), 2), **{k: round(float(series[k][-1]), 2) for k in RESOURCES}})
    worst = min(summary.values(), key=lambda v: (v["margin_days"] if v["margin_days"] is not None else 1e9))
    return {
        "scenario": asdict(sc), "supplies": asdict(sup), "assumptions": asdict(a),
        "total_days": round(total_days, 2), "timeline": timeline, "summary": summary, "warnings": warnings,
        "recommended_supplies": recommended,
        "verdict": "critical" if any(w["severity"] == "critical" for w in warnings) else ("warning" if warnings else "ok"),
        "limiting_resource": next(k for k, v in summary.items() if v is worst),
        "disclaimer": "Simplified mass-balance model for education and planning exploration. It is not sufficient for real astronaut safety decisions.",
    }


def run_scenarios(sup: Supplies, a: Assumptions, scenario_ids: list[str] | None = None) -> dict:
    ids = scenario_ids or list(SCENARIOS)
    results = {sid: simulate(sup, a, SCENARIOS[sid]) for sid in ids if sid in SCENARIOS}
    return {"results": results, "scenarios": [asdict(SCENARIOS[s]) for s in ids if s in SCENARIOS]}

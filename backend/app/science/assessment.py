"""Mission survival score: transparent category scores with confidence and hard caps for missing data."""

from __future__ import annotations

import numpy as np

from app.science import catalogues as C
from app.science import environment as E
from app.science import survival as S
from app.science import terrain as T

CATEGORY_WEIGHTS = {
    "terrain": 0.20, "route": 0.15, "resources": 0.25, "environment": 0.10,
    "science": 0.10, "return": 0.10, "data_completeness": 0.10,
}


def _cat(score: float, confidence: float, inputs: dict, explanation: str, warnings: list[str] | None = None) -> dict:
    return {"score": round(float(np.clip(score, 0, 100)), 1), "confidence": round(float(np.clip(confidence, 0, 1)), 2),
            "inputs": inputs, "explanation": explanation, "warnings": warnings or []}


def assess(plan: dict) -> dict:
    """plan = {base:{lon,lat}, targets:[ids], route:{geometry, ...} | None, supplies, assumptions, scenario_id, profile}"""
    profile = plan.get("profile", "rover")
    th = T.Thresholds.for_profile(profile)
    base = plan["base"]
    cats: dict[str, dict] = {}
    critical: list[str] = []
    recommendations: list[str] = []

    # --- terrain around base
    r_m = 1000.0
    dlat = r_m / T.DEG_M
    dlon = r_m / (T.DEG_M * np.cos(np.radians(base["lat"])))
    ts = T.region_stats(base["lon"] - dlon, base["lat"] - dlat, base["lon"] + dlon, base["lat"] + dlat, th)
    if ts.get("covered"):
        frac = ts["class_fractions"]
        score = 100 * (frac["benign"] + 0.6 * frac["caution"]) - 60 * frac["hazardous"] - 100 * frac["impassable"]
        conf = ts["coverage_fraction"] * (1.0 if ts.get("roughness_resolved") else 0.5)
        warn = []
        if frac["hazardous"] + frac["impassable"] > 0.15:
            warn.append(f"{100*(frac['hazardous']+frac['impassable']):.0f}% of the 1 km base area is hazardous/impassable terrain.")
            recommendations.append("Move the base to smoother terrain (lower slope p90) or reduce EVA radius.")
        cats["terrain"] = _cat(score, conf, {"slope_p90_deg": round(ts["slope_deg"]["p90"], 1), "class_fractions": frac,
                                             "dataset": ts["dataset_id"], "resolution_m": ts["resolution_m"]},
                               f"Base area (1 km radius): {100*frac['benign']:.0f}% benign, {100*frac['caution']:.0f}% caution, slope p90 {ts['slope_deg']['p90']:.1f}°.", warn)
    else:
        cats["terrain"] = _cat(0, 0.1, {}, "No terrain data covers the base location.", ["Base is outside terrain coverage."])
        critical.append("Base location has no terrain data; terrain risk cannot be evaluated.")

    # --- route
    route = plan.get("route")
    if route:
        L = max(1.0, route.get("length_m", 0))
        haz = route.get("hazard_m", 0) / L
        cau = route.get("caution_m", 0) / L
        cov = route.get("coverage_fraction", 0)
        score = 100 - 250 * haz - 60 * cau
        conf = cov * (1.0 if route.get("verified") else 0.6)
        warn = []
        if not route.get("verified"):
            warn.append("Route includes unverified terrain (outside 20 m DTM).")
        if haz > 0.02:
            warn.append(f"{100*haz:.1f}% of the route is on hazardous slopes.")
            recommendations.append("Re-plan with the 'lowest risk' strategy or add a waypoint to bypass hazardous segments.")
        cats["route"] = _cat(score, conf, {"length_km": round(L / 1000, 2), "hazard_fraction": round(haz, 3), "caution_fraction": round(cau, 3),
                                           "max_slope_deg": route.get("max_slope_deg"), "coverage": cov, "verified": route.get("verified")},
                             f"Route {L/1000:.1f} km, max slope {route.get('max_slope_deg')}°, {100*haz:.1f}% hazardous, verified={route.get('verified')}.", warn)
    else:
        cats["route"] = _cat(0, 0.2, {}, "No route planned.", ["No route planned."])
        recommendations.append("Plan a route from the base to the science targets.")

    # --- resources
    sup = S.Supplies(**plan.get("supplies", {}))
    asm = S.Assumptions(**{k: v for k, v in plan.get("assumptions", {}).items() if k != "sources"})
    sc = S.SCENARIOS.get(plan.get("scenario_id", "normal"), S.SCENARIOS["normal"])
    sim = S.simulate(sup, asm, sc)
    margins = {k: v["margin_days"] for k, v in sim["summary"].items() if v["margin_days"] is not None}
    worst_k = min(margins, key=margins.get) if margins else None
    worst = margins[worst_k] if worst_k else 0
    # score: margin of 0 days -> 40, >= 5 days -> 100, negative -> below 40
    score = float(np.interp(worst, [-5, 0, 2, 5], [0, 40, 75, 100]))
    warn = [w["message"] for w in sim["warnings"]]
    if sim["verdict"] == "critical":
        critical.append(f"{S.LABELS[sim['limiting_resource']]} runs out before mission end in scenario '{sc.name}'.")
        rec = sim["recommended_supplies"][sim["limiting_resource"]]
        recommendations.append(f"Increase {S.LABELS[sim['limiting_resource']].split(' (')[0].lower()} to at least {rec} or shorten the mission.")
    cats["resources"] = _cat(score, 0.7, {"scenario": sc.name, "limiting_resource": sim["limiting_resource"], "margins_days": margins,
                                          "crew": sup.crew, "duration_days": sup.duration_days},
                             f"Limiting resource {S.LABELS[sim['limiting_resource']]} with {worst:+.1f} days margin under '{sc.name}'.", warn)

    # --- environment (always low confidence: no on-site forecast)
    meda = E.meda_summary()
    rad = E.rad_summary()
    have_meda = bool(meda["records"])
    have_rad = bool(rad["records"])
    env_score = 55.0  # neutral baseline: Mars is always hostile; data presence raises confidence not score
    warn = ["No real-time weather data exists for mission planning; dust events cannot be predicted here."]
    inputs = {}
    if have_meda and meda["range"]["air_temp_c"]:
        inputs["meda_air_temp_c_range"] = meda["range"]["air_temp_c"]
        inputs["meda_pressure_pa_range"] = meda["range"]["pressure_pa"]
        env_score += 5
    if have_rad and rad["typical_dose_per_sol_E_uGy"]:
        inputs["rad_reference_dose_per_sol_uGy"] = rad["typical_dose_per_sol_E_uGy"]
        total = rad["typical_dose_per_sol_E_uGy"] * (sim["total_days"]) / 1000
        inputs["estimated_mission_dose_mGy_reference"] = round(total, 2)
        warn.append(f"Reference GCR dose for {sim['total_days']:.0f} sols ≈ {total:.1f} mGy (Gale crater value, not Jezero; excludes solar particle events).")
    cats["environment"] = _cat(env_score, 0.35 if (have_meda or have_rad) else 0.15, inputs,
                               "Historical MEDA/RAD data give context only; environmental risk remains uncertain by design.", warn)

    # --- science access
    tids = plan.get("targets", [])
    targets = [t for t in (C.target_by_id(i) for i in tids) if t]
    if targets:
        reach_km = (asm.rover_km_per_day or 2.0) * sup.duration_days + 1.0
        dists = [T.haversine_m(base["lon"], base["lat"], t["lon"], t["lat"]) / 1000 for t in targets]
        reachable = sum(1 for d in dists if d <= reach_km)
        score = 100 * reachable / len(targets)
        cats["science"] = _cat(score, 0.6, {"targets": [t["name"] for t in targets], "distances_km": [round(d, 1) for d in dists], "reach_km": round(reach_km, 1)},
                               f"{reachable}/{len(targets)} selected targets are within the estimated {reach_km:.0f} km reach.",
                               [] if reachable == len(targets) else [f"{len(targets)-reachable} target(s) exceed the mobility reach."])
        if reachable < len(targets):
            recommendations.append("Drop distant targets or increase rover range / mission duration.")
    else:
        cats["science"] = _cat(30, 0.5, {}, "No science targets selected.", ["No science targets selected."])
        recommendations.append("Select at least one science target in Science Discovery mode.")

    # --- return feasibility
    if route:
        back_days = route.get("estimated_duration_h", 0) / 24 if route.get("estimated_duration_h") else 0.5
        power_margin = sim["summary"]["power"]["margin_days"]
        o2_margin = sim["summary"]["oxygen"]["margin_days"]
        m = min(x for x in (power_margin, o2_margin) if x is not None) if (power_margin is not None or o2_margin is not None) else 0
        score = float(np.interp(m - back_days, [-3, 0, 2, 5], [0, 45, 80, 100]))
        cats["return"] = _cat(score, cats["route"]["confidence"], {"return_drive_days": round(back_days, 2), "power_margin_days": power_margin, "o2_margin_days": o2_margin},
                              f"Return drive ≈ {back_days*24:.1f} h; consumable margin after return {m-back_days:+.1f} days.",
                              [] if m - back_days > 0 else ["Consumables do not cover the return journey with the planned reserve."])
        if m - back_days <= 0:
            critical.append("Return journey is not covered by consumable margins.")
            recommendations.append("Add consumable margin for the return leg: increase oxygen/battery or shorten the surface stay.")
    else:
        cats["return"] = _cat(0, 0.2, {}, "Return feasibility requires a planned route.", ["No route."])

    # --- data completeness
    comp_items = {
        "terrain_20m": bool(ts.get("covered") and ts.get("roughness_resolved")),
        "route_verified": bool(route and route.get("verified")),
        "meda_history": have_meda, "rad_reference": have_rad,
        "targets_selected": bool(targets),
    }
    comp = 100 * sum(comp_items.values()) / len(comp_items)
    cats["data_completeness"] = _cat(comp, 1.0, comp_items, f"{sum(comp_items.values())}/{len(comp_items)} data requirements satisfied.",
                                     [k.replace('_', ' ') + " missing" for k, v in comp_items.items() if not v])

    # --- overall with caps
    overall = sum(CATEGORY_WEIGHTS[k] * cats[k]["score"] for k in CATEGORY_WEIGHTS)
    confidence = sum(CATEGORY_WEIGHTS[k] * cats[k]["confidence"] for k in CATEGORY_WEIGHTS)
    caps = []
    if any(cats[k]["score"] < 30 for k in ("terrain", "route", "resources", "return")):
        overall = min(overall, 45.0)
        caps.append("A core category scored below 30 → overall capped at 45 (not recommended).")
    if comp < 50:
        overall = min(overall, 60.0)
        caps.append("Data completeness below 50% → overall capped at 60 (insufficient data).")
    if overall >= 75 and not critical and confidence >= 0.5:
        verdict = "feasible"
    elif overall >= 55 and not critical:
        verdict = "feasible_with_changes"
    elif comp < 50:
        verdict = "insufficient_data"
    else:
        verdict = "not_recommended"
    return {
        "overall_score": round(overall, 1), "confidence": round(confidence, 2), "verdict": verdict, "caps_applied": caps,
        "categories": cats, "weights": CATEGORY_WEIGHTS, "critical_warnings": critical,
        "recommendations": list(dict.fromkeys(recommendations)),
        "simulation_verdict": sim["verdict"], "scenario": sc.name,
        "disclaimer": "Transparent research estimate. Missing data lowers confidence and can block a positive verdict; it never improves the score.",
    }

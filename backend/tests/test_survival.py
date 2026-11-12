import pytest
from app.science import survival as S

def test_nominal_simulation():
    sup = S.Supplies(crew=2, duration_days=10, oxygen_kg=40, water_kg=120, battery_kwh=800)
    asm = S.Assumptions()
    sc = S.SCENARIOS["normal"]
    res = S.simulate(sup, asm, sc)
    assert res["verdict"] in ("ok", "warning")
    assert res["total_days"] >= 10
    assert "timeline" in res
    assert len(res["timeline"]) > 5
    assert res["summary"]["oxygen"]["remaining_at_end"] > 0
    assert res["summary"]["water"]["remaining_at_end"] > 0

def test_delay_scenario_warning():
    # Very short supplies with a 5-day delay should trigger warnings or depletion
    sup = S.Supplies(crew=2, duration_days=5, oxygen_kg=8.5, water_kg=25, food_kg=5)
    asm = S.Assumptions()
    sc = S.SCENARIOS["delay"]  # adds 5 delay days
    res = S.simulate(sup, asm, sc)
    assert res["verdict"] in ("warning", "critical")
    assert len(res["warnings"]) > 0

def test_all_scenarios_run():
    sup = S.Supplies()
    asm = S.Assumptions()
    all_res = S.run_scenarios(sup, asm)
    assert len(all_res["results"]) == len(S.SCENARIOS)
    assert "scrubber_failure" in all_res["results"]
    assert "power_failure" in all_res["results"]

import pytest
from app.science import landing as L
from app.science import assessment as A
from app.science import terrain as T

@pytest.fixture(autouse=True)
def load_grids():
    T.store.load()

def test_landing_site_scoring():
    sites = [
        {"name": "Octavia Butler", "lon": 77.4509, "lat": 18.4446},
        {"name": "Delta Scarp", "lon": 77.3820, "lat": 18.4280},
    ]
    res = L.compare_sites(sites, radius_m=1000, weights=None, profile="rover")
    assert len(res["sites"]) == 2
    assert "Octavia Butler" in res["ranking"]
    for s in res["sites"]:
        assert 0 <= s["overall_score"] <= 100
        assert s["verdict"] in ("favourable", "marginal", "unfavourable", "cannot_assess")

def test_mission_assessment_safety_capping():
    # If route or resources are critically failing, safety cap should be applied
    plan = {
        "base": {"lon": 77.45, "lat": 18.44},
        "targets": [],
        "route": None,  # No route -> low score
        "supplies": {"crew": 4, "duration_days": 30, "oxygen_kg": 1, "water_kg": 1},  # Depleted
        "assumptions": {},
        "scenario_id": "normal",
        "profile": "rover",
    }
    res = A.assess(plan)
    assert res["overall_score"] <= 45.0
    assert res["verdict"] in ("not_recommended", "insufficient_data")
    assert len(res["caps_applied"]) > 0

def test_mission_assessment_healthy():
    plan = {
        "base": {"lon": 77.4509, "lat": 18.4446},
        "targets": ["kodiak_butte"],
        "route": {
            "length_m": 2500,
            "hazard_m": 0,
            "caution_m": 200,
            "coverage_fraction": 1.0,
            "verified": True,
            "estimated_duration_h": 20,
        },
        "supplies": {"crew": 2, "duration_days": 10, "oxygen_kg": 50, "water_kg": 150, "battery_kwh": 900},
        "assumptions": {},
        "scenario_id": "normal",
        "profile": "rover",
    }
    res = A.assess(plan)
    assert res["overall_score"] >= 50.0
    assert "categories" in res
    assert len(res["categories"]) == 7

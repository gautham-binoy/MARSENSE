import pytest
from app.science import routing as R
from app.science import terrain as T

@pytest.fixture(autouse=True)
def load_grids():
    T.store.load()

def test_plan_route_valid():
    start = (77.4509, 18.4446)
    dest = (77.4350, 18.4350)
    c = R.RouteConstraints(profile="rover", speed_kmh=0.12)
    res = R.plan_route([start, dest], "balanced", c)
    assert res["length_m"] > 500
    assert res["climb_m"] >= 0
    assert res["geometry"]["type"] == "LineString"
    assert len(res["geometry"]["coordinates"]) >= 2
    assert res["verified"] is True
    assert res["estimated_duration_h"] is not None

def test_plan_route_strategies_comparison():
    start = (77.4509, 18.4446)
    dest = (77.4300, 18.4300)
    c = R.RouteConstraints(profile="rover", speed_kmh=0.12)
    alts = R.plan_alternatives([start, dest], c)
    assert "routes" in alts
    assert "shortest" in alts["routes"]
    assert "balanced" in alts["routes"]
    assert "lowest_risk" in alts["routes"]
    # Lowest risk should not have more hazard meters than shortest
    short = alts["routes"]["shortest"]
    safe = alts["routes"]["lowest_risk"]
    assert safe["hazard_m"] <= short["hazard_m"]

def test_plan_route_outside_coverage():
    start = (0.0, 0.0)
    dest = (0.1, 0.1)
    c = R.RouteConstraints()
    with pytest.raises(R.RouteError):
        R.plan_route([start, dest], "balanced", c)

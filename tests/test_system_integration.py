"""Full system integration test verifying the entire MARSENSE planetary science pipeline.

Covers:
1. Terrain loading & regional finite-difference statistics (Horn 1981, Riley 1999)
2. Elevation transect profiling
3. Landing-site multi-criteria scoring
4. Terrain-aware A* pathfinding
5. BVAD 2022 astronaut life-support simulation
6. Mission assessment & safety capping logic
7. ReportLab PDF flight plan generation
8. SQLite database persistence
"""

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure backend is on sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_full_mission_lifecycle_pipeline(client):
    # 1. System Health Check
    health_resp = client.get("/api/health")
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert health_data["status"] == "ok"
    assert "ctx_dtm_jezero_20m" in health_data["terrain_loaded"]

    # 2. Regional Terrain Analysis (Horn slope & Riley TRI)
    terrain_resp = client.post(
        "/api/terrain/analyze",
        json={
            "west": 77.40,
            "south": 18.42,
            "east": 77.46,
            "north": 18.46,
            "profile": "rover",
        },
    )
    assert terrain_resp.status_code == 200
    t_data = terrain_resp.json()
    assert t_data["covered"] is True
    assert t_data["area_km2"] > 0
    assert "benign" in t_data["class_fractions"]
    assert 0.0 <= t_data["traversability_index"] <= 1.0

    # 3. Elevation Transect Profile
    profile_resp = client.post(
        "/api/terrain/profile",
        json={
            "points": [
                {"lon": 77.4509, "lat": 18.4446},
                {"lon": 77.4200, "lat": 18.4100},
            ],
            "step_m": 25,
        },
    )
    assert profile_resp.status_code == 200
    p_data = profile_resp.json()
    assert len(p_data["samples"]) > 10
    assert p_data["length_m"] > 2000
    assert p_data["coverage_fraction"] == 1.0

    # 4. Landing Site Multi-Criteria Comparison
    landing_resp = client.post(
        "/api/landing-sites/compare",
        json={
            "sites": [
                {"name": "Octavia E. Butler Base", "lon": 77.4509, "lat": 18.4446},
                {"name": "Western Delta Front", "lon": 77.3820, "lat": 18.4280},
            ],
            "radius_m": 1000,
            "weights": {
                "slope": 0.30,
                "roughness": 0.20,
                "elevation": 0.10,
                "science_proximity": 0.20,
                "geological_interest": 0.10,
                "resource_evidence": 0.05,
                "data_coverage": 0.05,
            },
            "profile": "rover",
        },
    )
    assert landing_resp.status_code == 200
    l_data = landing_resp.json()
    assert len(l_data["sites"]) == 2
    assert l_data["sites"][0]["overall_score"] > 50

    # 5. A* Route Pathfinding (Lowest Risk Strategy)
    route_resp = client.post(
        "/api/routes/plan",
        json={
            "points": [
                {"lon": 77.4509, "lat": 18.4446},
                {"lon": 77.4200, "lat": 18.4100},
            ],
            "strategy": "lowest_risk",
            "profile": "rover",
            "speed_kmh": 0.12,
            "alternatives": False,
        },
    )
    assert route_resp.status_code == 200
    r_data = route_resp.json()
    assert r_data["length_m"] > 0
    assert r_data["verified"] is True
    assert len(r_data["geometry"]["coordinates"]) > 5

    # 6. NASA BVAD 2022 Life-Support Simulation
    survival_resp = client.post(
        "/api/survival/simulate",
        json={
            "supplies": {
                "crew": 2,
                "duration_days": 1,
                "oxygen_kg": 50.0,
                "water_kg": 150.0,
                "battery_kwh": 24.0,
                "co2_scrubber_capacity_kg": 30.0,
                "food_kg": 40.0,
                "emergency_reserve_fraction": 0.20,
                "return_journey_days": 0.25,
            },
            "assumptions": {
                "o2_kg_per_day": 0.84,
                "o2_eva_multiplier": 2.5,
                "water_kg_per_day": 2.5,
                "habitat_power_kw": 0.45,
            },
            "scenario_ids": ["normal", "delay_4h"],
        },
    )
    assert survival_resp.status_code == 200
    s_data = survival_resp.json()
    assert "normal" in s_data["results"]
    assert s_data["results"]["normal"]["verdict"] in ("ok", "warning")

    # 7. Mission Feasibility Assessment
    assess_resp = client.post(
        "/api/missions/assess",
        json={
            "base": {"lon": 77.4509, "lat": 18.4446},
            "targets": ["kodiak_butte"],
            "route": r_data,
            "supplies": {
                "crew": 2,
                "duration_days": 1,
                "oxygen_kg": 50.0,
                "water_kg": 150.0,
                "battery_kwh": 24.0,
                "co2_scrubber_capacity_kg": 30.0,
                "food_kg": 40.0,
                "emergency_reserve_fraction": 0.20,
                "return_journey_days": 0.25,
            },
            "assumptions": {
                "o2_kg_per_day": 0.84,
                "o2_eva_multiplier": 2.5,
                "co2_kg_per_day": 1.0,
                "water_kg_per_day": 2.5,
                "hygiene_water_kg_per_day": 1.0,
                "water_recycling_efficiency": 0.0,
                "food_kg_per_day": 0.62,
                "habitat_power_kw": 0.45,
                "eva_suit_power_kwh_per_h": 0.15,
                "rover_kwh_per_km": 0.18,
                "solar_recharge_kwh_per_sol": 8.0,
                "eva_hours_per_day": 8.0,
                "rover_km_per_day": 5.0,
            },
            "scenario_id": "normal",
            "profile": "rover",
        },
    )
    assert assess_resp.status_code == 200
    a_data = assess_resp.json()
    assert a_data["overall_score"] > 0
    assert a_data["verdict"] in ("feasible", "feasible_with_changes", "not_recommended")

    # 8. Flight-Ready PDF Report Generation
    report_resp = client.post(
        "/api/reports/mission",
        json={
            "mission_name": "Integration Test Mission",
            "plan": {
                "base": {"lon": 77.4509, "lat": 18.4446},
                "route": r_data,
                "supplies": {
                    "crew": 2,
                    "duration_days": 1,
                    "oxygen_kg": 50.0,
                    "water_kg": 150.0,
                    "battery_kwh": 24.0,
                    "co2_scrubber_capacity_kg": 30.0,
                    "food_kg": 40.0,
                    "emergency_reserve_fraction": 0.20,
                    "return_journey_days": 0.25,
                },
            },
            "assessment": a_data,
        },
    )
    assert report_resp.status_code == 200
    assert report_resp.headers["content-type"] == "application/pdf"
    assert report_resp.content.startswith(b"%PDF-1.4")

    # 9. SQLite Database Persistence (Create -> Read -> Update -> Delete)
    # Create
    create_resp = client.post(
        "/api/missions",
        json={
            "name": "Integration Test Mission",
            "region_id": "jezero",
            "plan": {"route": r_data},
            "assessment": a_data,
        },
    )
    assert create_resp.status_code == 201
    mid = create_resp.json()["id"]

    # Read
    read_resp = client.get(f"/api/missions/{mid}")
    assert read_resp.status_code == 200
    assert read_resp.json()["name"] == "Integration Test Mission"

    # Update
    update_resp = client.put(
        f"/api/missions/{mid}",
        json={
            "name": "Updated Integration Test Mission",
            "region_id": "jezero",
            "plan": {"route": r_data},
            "assessment": a_data,
        },
    )
    assert update_resp.status_code == 200

    # Delete
    del_resp = client.delete(f"/api/missions/{mid}")
    assert del_resp.status_code == 204

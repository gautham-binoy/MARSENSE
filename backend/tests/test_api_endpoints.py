from fastapi.testclient import TestClient
from app.main import app

def test_api_health():
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "ctx_dtm_jezero_20m" in data["terrain_loaded"]

def test_api_datasets_and_layers():
    with TestClient(app) as client:
        r = client.get("/api/datasets")
        assert r.status_code == 200
        assert len(r.json()["datasets"]) >= 9

        r = client.get("/api/layers")
        assert r.status_code == 200
        assert len(r.json()) >= 10

def test_api_location_inspect():
    with TestClient(app) as client:
        r = client.get("/api/locations/inspect?lon=77.45&lat=18.44")
        assert r.status_code == 200
        data = r.json()
        assert data["terrain"]["covered"] is True
        assert data["confidence"] > 0.5
        assert len(data["provenance"]) > 0

def test_api_mission_report_pdf():
    with TestClient(app) as client:
        req = {
            "mission_name": "NASA Space Apps Test Mission",
            "plan": {
                "base": {"lon": 77.45, "lat": 18.44},
                "targets": ["kodiak_butte"],
                "supplies": {"crew": 2, "duration_days": 10},
            },
        }
        r = client.post("/api/reports/mission", json=req)
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        # Standard PDF magic header
        assert r.content.startswith(b"%PDF")

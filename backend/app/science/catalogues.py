"""Curated catalogue access (science targets, mineral evidence) and rover tracks."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.config import settings
from app.science.terrain import haversine_m


def _load(path: Path) -> dict:
    return json.loads(path.read_text()) if path.exists() else {}


@lru_cache(maxsize=1)
def science_targets() -> dict:
    return _load(settings.metadata_dir / "jezero_science_targets.json")


@lru_cache(maxsize=1)
def mineral_evidence() -> dict:
    return _load(settings.metadata_dir / "jezero_mineral_evidence.json")


def targets_list() -> list[dict]:
    return science_targets().get("targets", [])


def evidence_list() -> list[dict]:
    return mineral_evidence().get("evidence", [])


def target_by_id(tid: str) -> dict | None:
    return next((t for t in targets_list() if t["id"] == tid), None)


def nearby_targets(lon: float, lat: float, radius_m: float = 10000, limit: int = 6) -> list[dict]:
    out = []
    for t in targets_list():
        d = haversine_m(lon, lat, t["lon"], t["lat"])
        if d <= radius_m:
            out.append({**t, "distance_m": round(d)})
    out.sort(key=lambda t: t["distance_m"])
    return out[:limit]


def nearby_evidence(lon: float, lat: float, radius_m: float = 5000) -> list[dict]:
    out = []
    for e in evidence_list():
        d = haversine_m(lon, lat, e["lon"], e["lat"])
        if d <= radius_m + e.get("radius_m", 0):
            out.append({**e, "distance_m": round(max(0.0, d - e.get("radius_m", 0)))})
    out.sort(key=lambda e: e["distance_m"])
    return out


def rover_tracks() -> dict:
    raw = settings.raw_dir
    traverse = _load(raw / "M20_traverse.json")
    current = _load(raw / "M20_waypoints_current.json")
    waypoints = _load(raw / "M20_waypoints.json")
    msl = _load(raw / "MSL_waypoints_current.json")
    fetched = None
    log = settings.metadata_dir / "fetch_log.jsonl"
    if log.exists():
        for line in log.read_text().splitlines()[::-1]:
            if "M20_traverse" in line:
                fetched = json.loads(line)["fetched_at"]
                break
    return {"traverse": traverse, "current": current, "waypoints": waypoints, "msl_current": msl, "fetched_at": fetched}

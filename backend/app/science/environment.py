"""Environmental intelligence: MEDA (Jezero) and RAD (Gale) historical summaries."""

from __future__ import annotations

import json
from functools import lru_cache

from app.config import settings
from app.science import catalogues as C

GALE_SITE = {"name": "Gale crater (Curiosity)", "lon": 137.44, "lat": -4.59, "elevation_m": -4400,
             "distance_to_jezero_km": 2470, "note": "Reference site ~2,470 km from Jezero at a lower elevation; dose rates there are NOT Jezero measurements."}


@lru_cache(maxsize=1)
def _load(name: str) -> dict:
    p = settings.processed_dir / name
    return json.loads(p.read_text()) if p.exists() else {"records": []}


def reload() -> None:
    _load.cache_clear()


def meda_summary() -> dict:
    data = _load("meda_summary.json")
    wps = {f["properties"]["sol"]: f for f in C.rover_tracks().get("waypoints", {}).get("features", [])}
    sols = sorted(wps)
    records = []
    for r in data.get("records", []):
        rec = {"sol": r["sol"], "earth_date": None, "location": None}
        # rover position on (or just before) that sol
        prev = [s for s in sols if s <= r["sol"]]
        if prev:
            p = wps[prev[-1]]["properties"]
            rec["location"] = {"lon": p["lon"], "lat": p["lat"], "elevation_m": p.get("elev_geoid"), "basis": f"rover waypoint sol {prev[-1]}"}
        if r.get("pressure"):
            ps = r["pressure"]
            rec["earth_date"] = ps.get("earth_date")
            rec["pressure_pa"] = {k: round(ps[k], 1) for k in ("min", "mean", "max") if ps.get(k) is not None}
            rec["pressure_meta"] = {"sensors": ps["sensors"], "n_samples": ps["n_samples"], "file": ps["file"], "ltst": [ps.get("ltst_start"), ps.get("ltst_end")]}
        if r.get("air_temperature"):
            at = r["air_temperature"]
            rec["earth_date"] = rec["earth_date"] or at.get("earth_date")
            rec["air_temp_c"] = {k: round(at[k] - 273.15, 1) for k in ("min", "mean", "max") if at.get(k) is not None}
            rec["air_temp_meta"] = {"sensors": at["sensors"], "n_samples": at["n_samples"], "file": at["file"], "ltst": [at.get("ltst_start"), at.get("ltst_end")]}
        records.append(rec)
    temps = [r["air_temp_c"] for r in records if "air_temp_c" in r]
    press = [r["pressure_pa"] for r in records if "pressure_pa" in r]
    return {
        "dataset_id": "m20_meda", "reliability": "measured", "historical": True,
        "instrument": "MEDA (Mars Environmental Dynamics Analyzer) - PS pressure sensor, ATS air temperature sensors",
        "location": "Perseverance rover, Jezero crater",
        "records": records,
        "range": {
            "air_temp_c": {"min": min(t["min"] for t in temps), "max": max(t["max"] for t in temps)} if temps else None,
            "pressure_pa": {"min": min(p["min"] for p in press), "max": max(p["max"] for p in press)} if press else None,
            "sols": [records[0]["sol"], records[-1]["sol"]] if records else None,
        },
        "coverage_note": "Sampled sols only (not continuous). Values are per-sol statistics over the sensors listed; partial-sol files may not include both night and day.",
        "no_realtime_note": "MARSENSE does not provide current Martian weather. These are archived PDS measurements.",
    }


def rad_summary() -> dict:
    data = _load("rad_summary.json")
    records = []
    for r in data.get("records", []):
        b, e = r.get("dose_rate_B_uGy_h"), r.get("dose_rate_E_uGy_h")
        records.append({
            "sol": r["sol"], "start_utc": r.get("start_utc"), "n_observations": r.get("n_observations"),
            "dose_rate_B_uGy_h": b, "dose_rate_E_uGy_h": e,
            "dose_per_sol_B_uGy": round(b["mean"] * 24.66, 1) if b else None,
            "dose_per_sol_E_uGy": round(e["mean"] * 24.66, 1) if e else None,
            "file": r.get("file"),
        })
    means_e = [r["dose_rate_E_uGy_h"]["mean"] for r in records if r["dose_rate_E_uGy_h"]]
    return {
        "dataset_id": "msl_rad", "reliability": "measured", "historical": True,
        "instrument": "RAD (Radiation Assessment Detector), detectors B (silicon) and E (tissue-equivalent plastic)",
        "site": GALE_SITE,
        "records": records,
        "typical_dose_rate_E_uGy_h": round(sum(means_e) / len(means_e), 2) if means_e else None,
        "typical_dose_per_sol_E_uGy": round(sum(means_e) / len(means_e) * 24.66, 1) if means_e else None,
        "published_reference": "Hassler et al. (2014) Science 343: mean GCR dose rate at Gale 0.21 ± 0.04 mGy/day (210 µGy/day) during 2012-2013.",
        "limitations": [
            "Absorbed dose (Gy) in silicon/plastic, not dose equivalent (Sv); no quality factor applied.",
            "Gale crater is ~2,470 km from Jezero and ~1.8 km lower: Jezero's thinner atmospheric column implies a slightly higher GCR dose, but no RAD-class instrument has measured Jezero.",
            "Solar energetic particle events are episodic and not represented by the sampled sols.",
        ],
    }

"""Explainable multi-criteria landing / base-site scoring (decision-support estimate, NOT a certified EDL assessment)."""

from __future__ import annotations

import numpy as np

from app.science import catalogues as C
from app.science import terrain as T

DEFAULT_WEIGHTS = {
    "slope": 0.25,
    "roughness": 0.20,
    "elevation": 0.10,
    "science_proximity": 0.15,
    "geological_interest": 0.10,
    "resource_evidence": 0.10,
    "data_coverage": 0.10,
}

EVIDENCE_SCORE = {"direct_observation": 100.0, "remote_sensing_indication": 70.0, "inference": 40.0, "unknown": 0.0}


def _lin(x: float, good: float, bad: float) -> float:
    """100 at `good`, 0 at `bad`, linear in between (works for either direction)."""
    if good == bad:
        return 100.0
    f = (x - bad) / (good - bad)
    return float(np.clip(f, 0.0, 1.0) * 100.0)


def score_site(lon: float, lat: float, radius_m: float = 1000.0, weights: dict | None = None,
               profile: str = "rover", name: str | None = None) -> dict:
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    th = T.Thresholds.for_profile(profile)
    dlat = radius_m / T.DEG_M
    dlon = radius_m / (T.DEG_M * np.cos(np.radians(lat)))
    stats = T.region_stats(lon - dlon, lat - dlat, lon + dlon, lat + dlat, th)
    factors: dict[str, dict] = {}
    missing: list[str] = []
    penalties: list[str] = []
    favourable: list[str] = []

    coverage = stats.get("coverage_fraction", 0.0) if stats.get("covered") else 0.0
    fine = bool(stats.get("roughness_resolved"))
    res_m = stats.get("resolution_m")

    if stats.get("covered"):
        s90 = stats["slope_deg"]["p90"]
        sc = _lin(s90, 5.0, 20.0)
        factors["slope"] = {"score": sc, "value": round(s90, 2), "unit": "deg (p90)", "confidence": coverage * (1.0 if fine else 0.5),
                            "detail": f"90th-percentile slope within {radius_m:.0f} m is {s90:.1f}° ({stats['dataset_id']}, {res_m:.0f} m/px)."}
        (favourable if sc >= 70 else penalties).append(
            f"Slope p90 {s90:.1f}° is {'well within' if sc >= 70 else 'above'} the ≤5° ideal for a base/landing zone.")
        if fine:
            r90 = stats["roughness_m"]["p90"]
            rc = _lin(r90, 1.5, 8.0)
            factors["roughness"] = {"score": rc, "value": round(r90, 2), "unit": "m RMS TRI (p90)", "confidence": coverage,
                                    "detail": f"Roughness p90 {r90:.1f} m at 20 m posting; obstacle density {stats['obstacle_density_per_km2']} /km²."}
            (favourable if rc >= 70 else penalties).append(f"Surface roughness p90 {r90:.1f} m ({'smooth' if rc >= 70 else 'rough'}).")
        else:
            missing.append("roughness (only coarse DEM coverage here; 20 m CTX DTM absent)")
        z = stats["elevation"]["mean"]
        ec = _lin(z, -2700.0, -1000.0)
        factors["elevation"] = {"score": ec, "value": round(z, 1), "unit": "m", "confidence": coverage,
                                "detail": "Lower elevation gives more atmosphere for entry/descent and parachute performance."}
        if ec >= 70:
            favourable.append(f"Low elevation ({z:.0f} m) favours EDL.")
    else:
        missing.extend(["slope", "roughness", "elevation"])

    targets = C.nearby_targets(lon, lat, radius_m=15000, limit=10)
    if targets:
        best = min(targets, key=lambda t: t["distance_m"] / (1 + 0.5 * t.get("priority", 1)))
        d = best["distance_m"]
        pc = _lin(d, 2000.0, 15000.0)
        factors["science_proximity"] = {"score": pc, "value": d, "unit": "m to best target", "confidence": 0.8,
                                        "detail": f"Nearest high-value target: {best['name']} at {d/1000:.1f} km."}
        (favourable if pc >= 60 else penalties).append(f"{best['name']} is {d/1000:.1f} km away.")
        types = {t["type"] for t in targets if t["distance_m"] <= 5000}
        gi = float(np.clip(len(types) / 4.0, 0, 1) * 100)
        factors["geological_interest"] = {"score": gi, "value": len(types), "unit": "distinct unit types ≤5 km", "confidence": 0.6,
                                          "detail": "Diversity of documented geological units within EVA range: " + ", ".join(sorted(types)) + "."}
    else:
        factors["science_proximity"] = {"score": 0.0, "value": None, "unit": "m", "confidence": 0.8, "detail": "No catalogued target within 15 km."}
        penalties.append("No documented science targets within 15 km.")
        missing.append("geological_interest (no catalogued units nearby)")

    evidence = C.nearby_evidence(lon, lat, radius_m=5000)
    if evidence:
        best_e = max(evidence, key=lambda e: EVIDENCE_SCORE.get(e["evidence_class"], 0))
        es = EVIDENCE_SCORE.get(best_e["evidence_class"], 0)
        factors["resource_evidence"] = {"score": es, "value": best_e["evidence_class"], "unit": "evidence class", "confidence": 0.6,
                                        "detail": f"{best_e['name']} ({best_e['evidence_class'].replace('_', ' ')}). Ancient-water evidence only; no extractable ice known at Jezero."}
        favourable.append(f"Documented aqueous mineral evidence nearby: {best_e['name']}.")
    else:
        factors["resource_evidence"] = {"score": 0.0, "value": "none", "unit": "evidence class", "confidence": 0.5,
                                        "detail": "No documented mineral/water evidence within 5 km."}
        penalties.append("No catalogued resource evidence within 5 km.")

    factors["data_coverage"] = {"score": coverage * 100 * (1.0 if fine else 0.5), "value": round(coverage, 3), "unit": "fraction", "confidence": 1.0,
                                "detail": f"{coverage*100:.0f}% of the assessment disc has {'20 m' if fine else 'coarse'} DEM coverage."}
    if coverage < 0.95:
        penalties.append(f"Only {coverage*100:.0f}% terrain coverage - confidence reduced.")

    used = {k: v for k, v in factors.items() if k in w}
    wsum = sum(w[k] for k in used)
    overall = sum(w[k] * used[k]["score"] for k in used) / wsum if wsum else 0.0
    conf = (sum(used[k]["confidence"] for k in used) / len(used) if used else 0.0) * (0.5 + 0.5 * coverage)
    if coverage < 0.5:
        verdict = "cannot_assess"
    elif overall >= 70 and conf >= 0.6:
        verdict = "favourable"
    elif overall >= 50:
        verdict = "marginal"
    else:
        verdict = "unfavourable"
    return {
        "name": name or f"{lat:.4f}N {lon:.4f}E",
        "lon": lon, "lat": lat, "radius_m": radius_m,
        "overall_score": round(overall, 1), "confidence": round(conf, 2), "verdict": verdict,
        "factors": {k: {**v, "score": round(v["score"], 1), "weight": w.get(k, 0)} for k, v in factors.items()},
        "weights": w, "missing": missing, "penalties": penalties, "favourable": favourable,
        "terrain": stats,
        "nearby_targets": targets[:5], "nearby_evidence": [{"id": e["id"], "name": e["name"], "evidence_class": e["evidence_class"], "distance_m": e["distance_m"]} for e in evidence[:5]],
        "disclaimer": "Research prototype decision-support estimate from a 20 m DTM and curated catalogues; not a NASA-certified landing-site assessment.",
    }


def compare_sites(sites: list[dict], radius_m: float, weights: dict | None, profile: str) -> dict:
    results = [score_site(s["lon"], s["lat"], radius_m, weights, profile, s.get("name")) for s in sites]
    ranked = sorted(results, key=lambda r: (r["verdict"] != "cannot_assess", r["overall_score"]), reverse=True)
    return {"sites": results, "ranking": [r["name"] for r in ranked], "weights": {**DEFAULT_WEIGHTS, **(weights or {})}}

"""All HTTP routers. Routers validate, delegate to app.science / app.data and serialise. No science here."""

from __future__ import annotations

import logging
from dataclasses import asdict

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import schemas as S
from app.data import ingest, layers, registry
from app.data.nasa_client import fetch_log
from app.db import (
    BookmarkedLocation,
    Mission,
    MissionRoute,
    Region,
    RouteWaypoint,
    SurvivalSimulation,
    get_session,
)
from app.science import (
    assessment,
    catalogues,
    environment,
    landing,
    report,
    routing,
    survival,
    terrain,
    tiles,
)

log = logging.getLogger("marsense.api")
api = APIRouter(prefix="/api")


def _prov(dataset_id: str | None, reliability: str, method: str | None = None, res: float | None = None, note: str | None = None) -> dict:
    return {"dataset_id": dataset_id, "reliability": reliability, "method": method, "resolution_m": res, "note": note}


def _clean(o):
    """Convert numpy scalars for JSON."""
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, (np.floating, np.integer)):
        v = o.item()
        return None if isinstance(v, float) and not np.isfinite(v) else v
    if isinstance(o, float) and not np.isfinite(o):
        return None
    return o


# ----------------------------------------------------------------------------- meta
@api.get("/health")
def health():
    g = terrain.store.primary
    return {"status": "ok", "terrain_loaded": [x.dataset_id for x in terrain.store.grids], "primary_resolution_m": g.resolution_m if g else None}


@api.get("/regions")
def regions(s: Session = Depends(get_session)):
    rows = s.scalars(select(Region)).all()
    return [{c.name: getattr(r, c.name) for c in Region.__table__.columns} for r in rows]


@api.get("/datasets")
def datasets():
    out = []
    for ds in registry.DATASETS.values():
        d = ds.model_dump()
        d["status"] = ingest.dataset_status(ds)
        out.append(d)
    return {"datasets": out, "fetch_log": fetch_log()[-50:]}


@api.get("/layers")
def get_layers():
    return [layer.model_dump() for layer in layers.LAYERS]


@api.get("/tiles/{layer}/{z}/{x}/{y}.png")
def tile(layer: str, z: int, x: int, y: int):
    if layer not in ("elevation", "slope", "roughness"):
        raise HTTPException(404)
    png = tiles.render_tile(layer, z, x, y)
    return Response(png, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


# ----------------------------------------------------------------------------- locations
@api.get("/locations/inspect")
def inspect(lon: float = Query(...), lat: float = Query(...), profile: str = "rover"):
    th = terrain.Thresholds.for_profile(profile)
    t = terrain.inspect_point(lon, lat, th)
    targets = catalogues.nearby_targets(lon, lat, radius_m=10000, limit=5)
    evidence = catalogues.nearby_evidence(lon, lat, radius_m=5000)
    conf = 0.0
    if t["covered"]:
        conf = 0.9 if t["dataset_id"] == "ctx_dtm_jezero_20m" else 0.45
    return _clean({
        "lon": lon, "lat": lat, "terrain": t, "nearby_targets": targets,
        "nearby_evidence": [{"id": e["id"], "name": e["name"], "evidence_class": e["evidence_class"], "distance_m": e["distance_m"], "category": e["category"]} for e in evidence],
        "confidence": conf,
        "provenance": [_prov(t["dataset_id"], t["reliability"] or "none", "bilinear sample; Horn slope; RMS-TRI", t["resolution_m"], t.get("note"))]
        if t["covered"] else [_prov(None, "none", note="outside coverage")],
    })


# ----------------------------------------------------------------------------- terrain
@api.post("/terrain/analyze")
async def terrain_analyze(req: S.TerrainAnalyzeRequest):
    th = terrain.Thresholds.for_profile(req.profile)
    if req.thresholds:
        for k, v in req.thresholds.items():
            if hasattr(th, k):
                setattr(th, k, float(v))
    if req.east <= req.west or req.north <= req.south:
        raise HTTPException(422, "invalid bbox")
    if (req.east - req.west) * (req.north - req.south) > 1.0:
        raise HTTPException(422, "bbox too large (max 1 square degree)")
    res = await run_in_threadpool(terrain.region_stats, req.west, req.south, req.east, req.north, th, req.polygon)
    res["provenance"] = [_prov(res.get("dataset_id"), res.get("reliability", "none"), "Horn 3x3 slope; RMS TRI; class = max(slope, roughness)", res.get("resolution_m"))]
    res["explanations"] = _terrain_explanations(res, th)
    return _clean(res)


def _terrain_explanations(res: dict, th: terrain.Thresholds) -> list[str]:
    if not res.get("covered"):
        return ["No DEM covers this area; nothing can be concluded about its terrain."]
    f = res["class_fractions"]
    out = [f"Classification uses slope thresholds {th.slope_caution}/{th.slope_hazard}/{th.slope_impassable}° and roughness {th.rough_caution}/{th.rough_hazard}/{th.rough_impassable} m ({th.profile} profile).",
           f"{100*f['benign']:.0f}% of the area is benign, {100*f['caution']:.0f}% caution, {100*f['hazardous']:.0f}% hazardous, {100*f['impassable']:.0f}% impassable."]
    if not res.get("roughness_resolved"):
        out.append("Only a coarse DEM is available here: roughness and small obstacles are unresolved, so hazards may be underestimated.")
    if res["coverage_fraction"] < 0.95:
        out.append(f"Only {100*res['coverage_fraction']:.0f}% of the requested area has data; the statistics describe the covered part only.")
    if res["slope_deg"]["p90"] > th.slope_hazard:
        out.append("The 90th-percentile slope exceeds the hazard threshold: expect frequent steep inclines (crater walls, delta scarps).")
    return out


@api.post("/terrain/profile")
def terrain_profile(req: S.ProfileRequest):
    pts = [(p.lon, p.lat) for p in req.points]
    res = terrain.elevation_profile(pts, req.step_m)
    res["provenance"] = [_prov(g.dataset_id, g.reliability, "bilinear sampling", g.resolution_m) for g in terrain.store.grids]
    return _clean(res)


@api.get("/terrain/thresholds")
def thresholds():
    return {"rover": asdict(terrain.Thresholds.rover()), "astronaut": asdict(terrain.Thresholds.astronaut())}


# ----------------------------------------------------------------------------- landing
@api.post("/landing-sites/compare")
async def landing_compare(req: S.LandingCompareRequest):
    res = await run_in_threadpool(landing.compare_sites, [s.model_dump() for s in req.sites], req.radius_m, req.weights, req.profile)
    res["provenance"] = [_prov("ctx_dtm_jezero_20m", "derived", "weighted multi-criteria score", 20.0),
                         _prov("jezero_science_targets", "inference", "proximity"), _prov("jezero_mineral_evidence", "inference", "best evidence class")]
    return _clean(res)


# ----------------------------------------------------------------------------- resources / science / rovers
@api.get("/resources/evidence")
def resources_evidence():
    data = catalogues.mineral_evidence()
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [e["lon"], e["lat"]]}, "properties": {k: v for k, v in e.items() if k not in ("lon", "lat")}}
             for e in data.get("evidence", [])]
    return {"type": "FeatureCollection", "features": feats, "disclaimer": data.get("disclaimer"), "reliability": "inference",
            "provenance": [_prov("jezero_mineral_evidence", "inference", "curated literature catalogue")]}


@api.get("/resources/water-ice")
def water_ice():
    data = catalogues.mineral_evidence()
    return {"type": "FeatureCollection", "features": [], **data.get("water_ice", {}), "provenance": [_prov("jezero_mineral_evidence", "inference")]}


@api.get("/science-targets")
def science_targets():
    data = catalogues.science_targets()
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [t["lon"], t["lat"]]}, "properties": {k: v for k, v in t.items() if k not in ("lon", "lat")}}
             for t in data.get("targets", [])]
    return {"type": "FeatureCollection", "features": feats, "note": data.get("note"), "provenance": [_prov("jezero_science_targets", "inference", "curated literature catalogue")]}


@api.get("/science-targets/{tid}")
def science_target(tid: str):
    t = catalogues.target_by_id(tid)
    if not t:
        raise HTTPException(404)
    th = terrain.Thresholds.rover()
    return _clean({**t, "terrain": terrain.inspect_point(t["lon"], t["lat"], th), "nearby_evidence": catalogues.nearby_evidence(t["lon"], t["lat"], 3000)})


@api.get("/rovers/m20/traverse")
def m20_traverse():
    rt = catalogues.rover_tracks()
    trav = rt["traverse"]
    cur = rt["current"]
    if not trav:
        raise HTTPException(503, "Perseverance traverse not cached; run ingestion --rover")
    # thin the line coordinates to keep the payload light
    feats = []
    for f in trav.get("features", []):
        coords = f["geometry"]["coordinates"]
        step = max(1, len(coords) // 40)
        feats.append({"type": "Feature", "properties": {"sol": f["properties"].get("sol")}, "geometry": {"type": "LineString", "coordinates": [c[:2] for c in coords[::step]] + [coords[-1][:2]]}})
    current = cur.get("features", [{}])[0] if cur else None
    return {"type": "FeatureCollection", "features": feats, "current": current, "fetched_at": rt["fetched_at"], "reliability": "measured",
            "provenance": [_prov("m20_traverse", "measured", "JPL MMGIS localization", 1.0)]}


@api.get("/rovers/positions")
def rover_positions():
    rt = catalogues.rover_tracks()
    out = []
    for key, name in (("current", "Perseverance (Mars 2020)"), ("msl_current", "Curiosity (MSL)")):
        fc = rt.get(key) or {}
        if fc.get("features"):
            p = fc["features"][0]["properties"]
            out.append({"rover": name, "lon": p["lon"], "lat": p["lat"], "sol": p.get("sol"), "elevation_m": p.get("elev_geoid"), "odometry_km": p.get("dist_km")})
    return {"rovers": out, "fetched_at": rt["fetched_at"], "reliability": "measured"}


# ----------------------------------------------------------------------------- environment
@api.get("/environment/meda")
def meda():
    r = environment.meda_summary()
    r["provenance"] = [_prov("m20_meda", "measured", "per-sol statistics of calibrated CSV samples")]
    return _clean(r)


@api.get("/environment/rad")
def rad():
    r = environment.rad_summary()
    r["provenance"] = [_prov("msl_rad", "measured", "mean of DOSIMETRY_TOTAL_DOSE fields per sol")]
    return _clean(r)


# ----------------------------------------------------------------------------- routes
@api.post("/routes/plan")
async def routes_plan(req: S.RouteRequest):
    pts = [(p.lon, p.lat) for p in req.points]
    c = routing.RouteConstraints(profile=req.profile, max_slope_deg=req.max_slope_deg, max_roughness_m=req.max_roughness_m,
                                 speed_kmh=req.speed_kmh, downsample=req.downsample)
    try:
        if req.alternatives:
            res = await run_in_threadpool(routing.plan_alternatives, pts, c)
        else:
            res = await run_in_threadpool(routing.plan_route, pts, req.strategy, c)
    except routing.RouteError as exc:
        raise HTTPException(422, str(exc)) from exc
    res["provenance"] = [_prov("ctx_dtm_jezero_20m", "derived", "A* over slope/roughness cost grid", 20.0)]
    return _clean(res)


@api.get("/routes/strategies")
def route_strategies():
    return {k: {"slope_weight": v[0], "roughness_weight": v[1], "description": v[2]} for k, v in routing.STRATEGIES.items()}


# ----------------------------------------------------------------------------- survival
@api.post("/survival/simulate")
def survival_simulate(req: S.SurvivalRequest):
    sup = survival.Supplies(**req.supplies.model_dump())
    asm = survival.Assumptions(**req.assumptions.model_dump())
    if req.custom_scenario:
        sc = survival.Scenario(**{k: v for k, v in req.custom_scenario.items() if k in survival.Scenario.__dataclass_fields__})
        return _clean({"results": {sc.id: survival.simulate(sup, asm, sc)}, "scenarios": [asdict(sc)]})
    return _clean(survival.run_scenarios(sup, asm, req.scenario_ids))


@api.get("/survival/scenarios")
def survival_scenarios():
    return {"scenarios": [asdict(s) for s in survival.SCENARIOS.values()], "defaults": {"supplies": asdict(survival.Supplies()), "assumptions": asdict(survival.Assumptions())}}


# ----------------------------------------------------------------------------- assessment
@api.post("/missions/assess")
async def missions_assess(req: S.AssessRequest):
    plan = req.model_dump()
    res = await run_in_threadpool(assessment.assess, plan)
    return _clean(res)


# ----------------------------------------------------------------------------- missions CRUD
@api.get("/missions")
def list_missions(s: Session = Depends(get_session)):
    rows = s.scalars(select(Mission).order_by(Mission.updated_at.desc())).all()
    return [{"id": m.id, "name": m.name, "region_id": m.region_id, "updated_at": m.updated_at, "verdict": (m.assessment or {}).get("verdict"),
             "score": (m.assessment or {}).get("overall_score")} for m in rows]


@api.post("/missions", status_code=201)
def create_mission(body: S.MissionIn, s: Session = Depends(get_session)):
    m = Mission(name=body.name, region_id=body.region_id, plan=body.plan, assessment=body.assessment)
    s.add(m)
    s.flush()
    _sync_children(m, body.plan)
    s.commit()
    return {"id": m.id}


@api.get("/missions/{mid}")
def get_mission(mid: int, s: Session = Depends(get_session)):
    m = s.get(Mission, mid)
    if not m:
        raise HTTPException(404)
    return {"id": m.id, "name": m.name, "region_id": m.region_id, "plan": m.plan, "assessment": m.assessment, "updated_at": m.updated_at}


@api.put("/missions/{mid}")
def update_mission(mid: int, body: S.MissionIn, s: Session = Depends(get_session)):
    m = s.get(Mission, mid)
    if not m:
        raise HTTPException(404)
    m.name, m.region_id, m.plan, m.assessment = body.name, body.region_id, body.plan, body.assessment
    m.routes.clear()
    m.simulations.clear()
    s.flush()
    _sync_children(m, body.plan)
    s.commit()
    return {"id": m.id}


@api.delete("/missions/{mid}", status_code=204)
def delete_mission(mid: int, s: Session = Depends(get_session)):
    m = s.get(Mission, mid)
    if m:
        s.delete(m)
        s.commit()
    return Response(status_code=204)


def _sync_children(m: Mission, plan: dict) -> None:
    route = plan.get("route")
    if route and route.get("geometry"):
        r = MissionRoute(mission=m, strategy=route.get("strategy", "balanced"), geometry=route["geometry"],
                         stats={k: route.get(k) for k in ("length_m", "climb_m", "hazard_m", "caution_m", "verified", "estimated_duration_h")})
        for i, p in enumerate(plan.get("route_points", [])):
            r.waypoints.append(RouteWaypoint(seq=i, lon=p["lon"], lat=p["lat"], label=p.get("label")))
        m.routes.append(r)
    if plan.get("supplies"):
        m.simulations.append(SurvivalSimulation(mission=m, scenario_id=plan.get("scenario_id", "normal"), supplies=plan["supplies"],
                                                assumptions=plan.get("assumptions", {}), result_summary=plan.get("simulation_summary", {})))


# ----------------------------------------------------------------------------- bookmarks
@api.get("/bookmarks")
def list_bookmarks(s: Session = Depends(get_session)):
    rows = s.scalars(select(BookmarkedLocation).order_by(BookmarkedLocation.created_at.desc())).all()
    return [{c.name: getattr(b, c.name) for c in BookmarkedLocation.__table__.columns} for b in rows]


@api.post("/bookmarks", status_code=201)
def create_bookmark(body: S.BookmarkIn, s: Session = Depends(get_session)):
    b = BookmarkedLocation(**body.model_dump())
    s.add(b)
    s.commit()
    return {"id": b.id}


@api.delete("/bookmarks/{bid}", status_code=204)
def delete_bookmark(bid: int, s: Session = Depends(get_session)):
    b = s.get(BookmarkedLocation, bid)
    if b:
        s.delete(b)
        s.commit()
    return Response(status_code=204)


# ----------------------------------------------------------------------------- report
@api.post("/reports/mission")
async def mission_report(req: S.ReportRequest):
    pdf = await run_in_threadpool(report.build_report, req.model_dump())
    fname = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in req.mission_name)[:60] or "mission"
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="MARSENSE_{fname}.pdf"'})

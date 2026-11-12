"""Terrain-aware route planning: A* on an 8-connected grid built from the best available DEM.

Cost per step = ground distance x multiplier(slope, roughness). Impassable / no-data cells are blocked.
Strategies change the weights; the heuristic (octile ground distance) stays admissible because every
multiplier is >= 1.
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass

import numpy as np

from app.science import terrain as T

STRATEGIES = {
    # (slope weight, roughness weight, description)
    "shortest": (0.15, 0.1, "Minimises distance; avoids only impassable terrain."),
    "balanced": (1.0, 0.6, "Trades distance against slope and roughness exposure."),
    "lowest_risk": (3.0, 2.0, "Strongly penalises any caution/hazardous terrain; longest but safest."),
}

MAX_CELLS = 2_200_000  # safety bound on nodes expanded


@dataclass
class RouteConstraints:
    profile: str = "rover"  # rover | astronaut
    max_slope_deg: float | None = None  # overrides threshold impassable
    max_roughness_m: float | None = None
    speed_kmh: float = 0.12  # Perseverance ~0.12 km/h average autonav; astronaut walking ~ 2-3 km/h
    downsample: int = 1  # grid decimation factor (1 = full 20 m)


class RouteError(ValueError):
    pass


def _cost_multiplier(slope: np.ndarray, rough: np.ndarray | None, th: T.Thresholds, ws: float, wr: float,
                     max_slope: float, max_rough: float | None) -> np.ndarray:
    """Multiplier >= 1 everywhere passable, inf where blocked."""
    s = np.nan_to_num(slope, nan=np.inf)
    # piecewise: 0 below caution, rises to 1 at hazard, 3 at impassable
    f = np.where(s < th.slope_caution, 0.0,
                 np.where(s < th.slope_hazard, (s - th.slope_caution) / max(1e-6, th.slope_hazard - th.slope_caution),
                          1.0 + 2.0 * (s - th.slope_hazard) / max(1e-6, max_slope - th.slope_hazard)))
    mult = 1.0 + ws * f
    blocked = ~np.isfinite(slope) | (s > max_slope)
    if rough is not None:
        r = np.nan_to_num(rough, nan=np.inf)
        mr = max_rough or th.rough_impassable
        g = np.where(r < th.rough_caution, 0.0,
                     np.where(r < th.rough_hazard, (r - th.rough_caution) / max(1e-6, th.rough_hazard - th.rough_caution),
                              1.0 + 2.0 * (r - th.rough_hazard) / max(1e-6, mr - th.rough_hazard)))
        mult = mult + wr * g
        blocked |= ~np.isfinite(rough) | (r > mr)
    mult = mult.astype(np.float64)
    mult[blocked] = np.inf
    return mult


def _astar(mult: np.ndarray, dx: float, dy: float, start: tuple[int, int], goal: tuple[int, int]) -> list[tuple[int, int]]:
    rows, cols = mult.shape
    if not np.isfinite(mult[start]):
        raise RouteError("Start location is on impassable or unmapped terrain.")
    if not np.isfinite(mult[goal]):
        raise RouteError("Destination is on impassable or unmapped terrain.")
    diag = math.hypot(dx, dy)
    steps = [(-1, 0, dy), (1, 0, dy), (0, -1, dx), (0, 1, dx), (-1, -1, diag), (-1, 1, diag), (1, -1, diag), (1, 1, diag)]

    def h(r: int, c: int) -> float:
        dr, dc = abs(r - goal[0]) * dy, abs(c - goal[1]) * dx
        m, M = min(dr, dc), max(dr, dc)
        return M - m + m * math.sqrt(2)  # octile with anisotropic pixels (approx.)

    g = np.full(mult.shape, np.inf)
    g[start] = 0.0
    came: dict[tuple[int, int], tuple[int, int]] = {}
    pq = [(h(*start), start)]
    closed = np.zeros(mult.shape, dtype=bool)
    expanded = 0
    while pq:
        _, cur = heapq.heappop(pq)
        if closed[cur]:
            continue
        if cur == goal:
            break
        closed[cur] = True
        expanded += 1
        if expanded > MAX_CELLS:
            raise RouteError("Search budget exceeded; try a coarser grid or closer points.")
        r, c = cur
        gc = g[cur]
        for dr, dc, dist in steps:
            nr, nc = r + dr, c + dc
            if nr < 0 or nc < 0 or nr >= rows or nc >= cols or closed[nr, nc]:
                continue
            m = mult[nr, nc]
            if not math.isfinite(m):
                continue
            ng = gc + dist * 0.5 * (m + mult[r, c])
            if ng < g[nr, nc]:
                g[nr, nc] = ng
                came[(nr, nc)] = cur
                heapq.heappush(pq, (ng + h(nr, nc), (nr, nc)))
    if not math.isfinite(g[goal]):
        raise RouteError("No passable path found between the points under the current constraints.")
    path = [goal]
    while path[-1] != start:
        path.append(came[path[-1]])
    path.reverse()
    return path


def _simplify(path: list[tuple[int, int]], tol: int = 1) -> list[tuple[int, int]]:
    """Remove collinear points to keep the GeoJSON light."""
    if len(path) < 3:
        return path
    out = [path[0]]
    for a, b, c in zip(path[:-2], path[1:-1], path[2:]):
        if (b[0] - a[0], b[1] - a[1]) != (c[0] - b[0], c[1] - b[1]):
            out.append(b)
    out.append(path[-1])
    return out


def plan_route(points: list[tuple[float, float]], strategy: str, constraints: RouteConstraints) -> dict:
    """Plan through an ordered list of (lon, lat) points (start, waypoints..., end)."""
    if strategy not in STRATEGIES:
        raise RouteError(f"unknown strategy {strategy}")
    if len(points) < 2:
        raise RouteError("At least a start and an end point are required.")
    th = T.Thresholds.for_profile(constraints.profile)
    max_slope = constraints.max_slope_deg or th.slope_impassable
    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    pad = 0.02
    grid = T.store.best_for_bbox(min(lons) - pad, min(lats) - pad, max(lons) + pad, max(lats) + pad)
    if grid is None:
        raise RouteError("No terrain data covers these points.")
    fine = grid.resolution_m <= T.ROUGHNESS_MAX_RES_M
    ws, wr, desc = STRATEGIES[strategy]
    k = max(1, constraints.downsample)
    slope = grid.slope[::k, ::k]
    rough = grid.roughness[::k, ::k] if fine else None
    mult = _cost_multiplier(slope, rough, th, ws, wr, max_slope, constraints.max_roughness_m)
    dx, dy = grid.pixel_size_m()
    dx, dy = dx * k, dy * k

    def to_cell(lon: float, lat: float) -> tuple[int, int]:
        if not grid.contains(lon, lat):
            raise RouteError(f"Point ({lon:.4f}, {lat:.4f}) is outside terrain coverage ({grid.dataset_id}).")
        r, c = grid.to_rc(lon, lat)
        return min(int(r // k), mult.shape[0] - 1), min(int(c // k), mult.shape[1] - 1)

    cells = [to_cell(*p) for p in points]
    full: list[tuple[int, int]] = []
    for a, b in zip(cells[:-1], cells[1:]):
        seg = _astar(mult, dx, dy, a, b)
        full.extend(seg if not full else seg[1:])
    simplified = _simplify(full)
    coords = [grid.to_lonlat(r * k + (k - 1) / 2, c * k + (k - 1) / 2) for r, c in simplified]
    coords[0] = points[0]
    coords[-1] = points[-1]
    profile = T.elevation_profile(coords, step_m=max(20.0, grid.resolution_m * k))
    # hazard segments from the sampled profile
    segs, cur = [], None
    for s in profile["samples"]:
        cls = None
        if s["slope"] is not None:
            cls = int(np.digitize(s["slope"], [th.slope_caution, th.slope_hazard, max_slope]))
        if cls is not None and cls >= 1:
            if cur and cur["class"] == cls and s["d"] - cur["end_m"] <= 2.5 * grid.resolution_m * k:
                cur["end_m"] = s["d"]
                cur["max_slope"] = max(cur["max_slope"], s["slope"])
            else:
                cur = {"start_m": s["d"], "end_m": s["d"], "class": cls, "max_slope": s["slope"]}
                segs.append(cur)
        else:
            cur = None
    for sg in segs:
        sg["class"] = T.CLASS_NAMES[sg["class"]]
    length_m = profile["length_m"]
    caution_m = sum(sg["end_m"] - sg["start_m"] for sg in segs if sg["class"] == "caution")
    hazard_m = sum(sg["end_m"] - sg["start_m"] for sg in segs if sg["class"] in ("hazardous", "impassable"))
    slopes = [s["slope"] for s in profile["samples"] if s["slope"] is not None]
    terrain_factor = 1.0 + 0.5 * (caution_m / length_m if length_m else 0) + 1.5 * (hazard_m / length_m if length_m else 0)
    drive_h = (length_m / 1000.0) / constraints.speed_kmh * terrain_factor if constraints.speed_kmh > 0 else None
    verified = profile["coverage_fraction"] >= 0.999 and fine
    return {
        "strategy": strategy,
        "strategy_description": desc,
        "geometry": {"type": "LineString", "coordinates": [[round(lon, 6), round(lat, 6)] for lon, lat in coords]},
        "length_m": length_m,
        "climb_m": profile["climb_m"],
        "descent_m": profile["descent_m"],
        "max_slope_deg": round(max(slopes), 1) if slopes else None,
        "mean_slope_deg": round(float(np.mean(slopes)), 2) if slopes else None,
        "caution_m": round(caution_m, 1),
        "hazard_m": round(hazard_m, 1),
        "hazard_segments": segs,
        "profile": profile["samples"][:: max(1, len(profile["samples"]) // 400)],
        "estimated_duration_h": round(drive_h, 2) if drive_h is not None else None,
        "terrain_time_factor": round(terrain_factor, 2),
        "coverage_fraction": profile["coverage_fraction"],
        "verified": verified,
        "verification_note": None if verified else (
            "Route crosses terrain without 20 m DTM coverage; hazards there are unverified." if not fine else
            "Parts of the route lack elevation data; treat as unverified."),
        "grid": {"dataset_id": grid.dataset_id, "resolution_m": grid.resolution_m * k, "roughness_used": fine},
        "constraints": {**constraints.__dict__, "thresholds": th.__dict__, "max_slope_deg": max_slope},
        "explanation": _explain(strategy, length_m, caution_m, hazard_m, profile["climb_m"], verified),
    }


def _explain(strategy: str, length: float, caution: float, hazard: float, climb: float, verified: bool) -> str:
    parts = [f"{STRATEGIES[strategy][2]}"]
    if length:
        parts.append(f"Route length {length/1000:.2f} km with {climb:.0f} m of cumulative climb.")
        parts.append(f"{100*caution/length:.1f}% of the path is on caution-class slopes and {100*hazard/length:.1f}% on hazardous slopes.")
    parts.append("Terrain along the whole route is covered by the 20 m CTX DTM." if verified else
                 "Parts of this route are NOT verified by high-resolution terrain data.")
    return " ".join(parts)


def plan_alternatives(points: list[tuple[float, float]], constraints: RouteConstraints) -> dict:
    out, errors = {}, {}
    for strat in STRATEGIES:
        try:
            out[strat] = plan_route(points, strat, constraints)
        except RouteError as exc:
            errors[strat] = str(exc)
    if not out:
        raise RouteError("; ".join(errors.values()))
    # recommendation: lowest risk unless it is > 35% longer than balanced
    rec = "balanced" if "balanced" in out else next(iter(out))
    if "lowest_risk" in out and "balanced" in out:
        lr, bal = out["lowest_risk"], out["balanced"]
        if lr["hazard_m"] < bal["hazard_m"] and lr["length_m"] <= 1.35 * bal["length_m"]:
            rec = "lowest_risk"
    return {"routes": out, "errors": errors, "recommended": rec,
            "recommendation_reason": ("Lowest-risk route removes hazardous segments for less than 35% extra distance."
                                      if rec == "lowest_risk" else "Balanced route offers the best distance/risk trade-off.")}

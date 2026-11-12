"""Terrain intelligence: DEM grids, slope, roughness, classification, profiles and region statistics.

Pure NumPy/SciPy; no HTTP. Grids are geographic (lat/lon degrees, Mars 2000 sphere) because both source
DEMs are equirectangular with standard parallel 0 on a sphere, i.e. a regular lat/lon raster.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy import ndimage

from app.config import settings

log = logging.getLogger("marsense.terrain")

MARS_R = 3396190.0  # m, IAU 2000 sphere
DEG_M = MARS_R * np.pi / 180.0  # metres per degree (lat, and lon at equator)


# ----------------------------------------------------------------------------- thresholds
@dataclass
class Thresholds:
    """Slope (deg) and roughness/TRI (m) class boundaries: benign | caution | hazardous | impassable."""

    slope_caution: float = 10.0
    slope_hazard: float = 20.0
    slope_impassable: float = 30.0
    rough_caution: float = 1.5
    rough_hazard: float = 4.0
    rough_impassable: float = 8.0
    profile: str = "rover"

    @classmethod
    def rover(cls) -> Thresholds:
        return cls()

    @classmethod
    def astronaut(cls) -> Thresholds:
        return cls(slope_caution=8.0, slope_hazard=15.0, slope_impassable=25.0, rough_caution=1.2, rough_hazard=3.0,
                   rough_impassable=6.0, profile="astronaut")

    @classmethod
    def for_profile(cls, name: str) -> Thresholds:
        return cls.astronaut() if name == "astronaut" else cls.rover()


CLASS_NAMES = ["benign", "caution", "hazardous", "impassable"]


# ----------------------------------------------------------------------------- grid
@dataclass
class Grid:
    """A geographic raster: value[row, col]; lon increases with col, lat decreases with row."""

    dataset_id: str
    data: np.ndarray  # float32, NaN = nodata
    west: float
    north: float
    dlon: float  # deg per pixel (positive)
    dlat: float  # deg per pixel (positive)
    resolution_m: float
    reliability: str = "processed_observation"
    slope: np.ndarray | None = field(default=None, repr=False)
    roughness: np.ndarray | None = field(default=None, repr=False)

    @property
    def rows(self) -> int:
        return self.data.shape[0]

    @property
    def cols(self) -> int:
        return self.data.shape[1]

    @property
    def east(self) -> float:
        return self.west + self.cols * self.dlon

    @property
    def south(self) -> float:
        return self.north - self.rows * self.dlat

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        return (self.west, self.south, self.east, self.north)

    def contains(self, lon: float, lat: float) -> bool:
        return self.west <= lon < self.east and self.south < lat <= self.north

    def to_rc(self, lon: float, lat: float) -> tuple[float, float]:
        """Fractional (row, col) of a lon/lat (pixel-corner convention)."""
        return (self.north - lat) / self.dlat, (lon - self.west) / self.dlon

    def to_lonlat(self, row: float, col: float) -> tuple[float, float]:
        return self.west + (col + 0.5) * self.dlon, self.north - (row + 0.5) * self.dlat

    def pixel_size_m(self, lat: float | None = None) -> tuple[float, float]:
        """(dx, dy) metres of a pixel at latitude `lat` (defaults to grid centre)."""
        lat = (self.north + self.south) / 2 if lat is None else lat
        return self.dlon * DEG_M * np.cos(np.radians(lat)), self.dlat * DEG_M

    def sample(self, arr: np.ndarray, lon: float, lat: float) -> float:
        """Bilinear sample with NaN handling; returns NaN outside coverage."""
        if not self.contains(lon, lat):
            return float("nan")
        r, c = self.to_rc(lon, lat)
        r -= 0.5
        c -= 0.5
        r0, c0 = int(np.floor(r)), int(np.floor(c))
        fr, fc = r - r0, c - c0
        vals, wts = [], []
        for dr, dc, w in ((0, 0, (1 - fr) * (1 - fc)), (0, 1, (1 - fr) * fc), (1, 0, fr * (1 - fc)), (1, 1, fr * fc)):
            rr, cc = r0 + dr, c0 + dc
            if 0 <= rr < self.rows and 0 <= cc < self.cols and w > 0:
                v = arr[rr, cc]
                if np.isfinite(v):
                    vals.append(v)
                    wts.append(w)
        if not wts:
            return float("nan")
        return float(np.dot(vals, wts) / np.sum(wts))

    def elevation(self, lon: float, lat: float) -> float:
        return self.sample(self.data, lon, lat)

    def window(self, west: float, south: float, east: float, north: float) -> tuple[slice, slice] | None:
        r0, c0 = self.to_rc(west, north)
        r1, c1 = self.to_rc(east, south)
        r0, r1 = int(np.floor(max(r0, 0))), int(np.ceil(min(r1, self.rows)))
        c0, c1 = int(np.floor(max(c0, 0))), int(np.ceil(min(c1, self.cols)))
        if r1 <= r0 or c1 <= c0:
            return None
        return slice(r0, r1), slice(c0, c1)


# ----------------------------------------------------------------------------- derivatives
def compute_slope_deg(dem: np.ndarray, dx_m: float, dy_m: float) -> np.ndarray:
    """Horn (1981) 3x3 slope in degrees. NaN propagates to neighbours."""
    z = dem.astype(np.float64)
    nan = ~np.isfinite(z)
    zf = np.where(nan, np.nanmean(z) if np.isfinite(z).any() else 0.0, z)
    kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=float) / (8.0 * dx_m)
    ky = np.array([[1, 2, 1], [0, 0, 0], [-1, -2, -1]], dtype=float) / (8.0 * dy_m)
    gx = ndimage.convolve(zf, kx, mode="nearest")
    gy = ndimage.convolve(zf, ky, mode="nearest")
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    bad = ndimage.binary_dilation(nan, structure=np.ones((3, 3)))
    slope[bad] = np.nan
    return slope.astype(np.float32)


def compute_tri(dem: np.ndarray) -> np.ndarray:
    """RMS Terrain Ruggedness Index: sqrt(mean((z_i - z_c)^2)) over the 8 neighbours (Riley 1999 TRI / sqrt(8)), metres."""
    z = dem.astype(np.float64)
    nan = ~np.isfinite(z)
    zf = np.where(nan, 0.0, z)
    acc = np.zeros_like(zf)
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            shifted = np.roll(np.roll(zf, dr, axis=0), dc, axis=1)
            acc += (shifted - zf) ** 2
    tri = np.sqrt(acc / 8.0)  # RMS over the 8 neighbours (TRI / sqrt(8)) so values are in "metres per neighbour"
    bad = ndimage.binary_dilation(nan, structure=np.ones((3, 3)))
    tri[bad] = np.nan
    tri[0, :] = tri[-1, :] = np.nan
    tri[:, 0] = tri[:, -1] = np.nan
    return tri.astype(np.float32)


def classify(slope: np.ndarray, rough: np.ndarray | None, th: Thresholds) -> np.ndarray:
    """0 benign, 1 caution, 2 hazardous, 3 impassable, 255 nodata. Class = max(slope class, roughness class).

    `rough=None` means roughness is unresolved at this grid's resolution (coarse DEMs) and only slope is used.
    """
    s_cls = np.digitize(np.nan_to_num(slope, nan=0.0), [th.slope_caution, th.slope_hazard, th.slope_impassable])
    bad = ~np.isfinite(slope)
    if rough is not None:
        r_cls = np.digitize(np.nan_to_num(rough, nan=0.0), [th.rough_caution, th.rough_hazard, th.rough_impassable])
        s_cls = np.maximum(s_cls, r_cls)
        bad |= ~np.isfinite(rough)
    cls = s_cls.astype(np.uint8)
    cls[bad] = 255
    return cls


ROUGHNESS_MAX_RES_M = 50.0  # roughness is only meaningful on DEMs finer than this


# ----------------------------------------------------------------------------- loading
def load_geotiff(path: Path, dataset_id: str, nodata_below: float = -1e30) -> Grid:
    import rasterio

    with rasterio.open(path) as src:
        data = src.read(1).astype(np.float32)
        t = src.transform
        nodata = src.nodata
        if nodata is not None:
            data[data == nodata] = np.nan
        data[data < nodata_below] = np.nan
        if src.crs is not None and src.crs.is_geographic:
            west, north, dlon, dlat = t.c, t.f, t.a, -t.e
            res_m = dlat * DEG_M
        else:  # equirectangular metres on sphere
            west, north = t.c / DEG_M, t.f / DEG_M
            dlon, dlat = t.a / DEG_M, -t.e / DEG_M
            res_m = -t.e
    return Grid(dataset_id=dataset_id, data=data, west=west, north=north, dlon=dlon, dlat=dlat, resolution_m=res_m)


def prepare_derivatives(grid: Grid) -> Grid:
    """Compute (or load cached) slope and roughness arrays for a grid."""
    cache = settings.processed_dir / f"{grid.dataset_id}_derivatives.npz"
    if cache.exists():
        try:
            z = np.load(cache)
            if z["slope"].shape == grid.data.shape:
                grid.slope, grid.roughness = z["slope"], z["tri"]
                return grid
        except Exception as exc:  # noqa: BLE001
            log.warning("derivative cache unreadable (%s); recomputing", exc)
    dx, dy = grid.pixel_size_m()
    grid.slope = compute_slope_deg(grid.data, dx, dy)
    grid.roughness = compute_tri(grid.data)
    np.savez_compressed(cache, slope=grid.slope, tri=grid.roughness)
    log.info("derivatives computed for %s (%dx%d, %.1f m/px)", grid.dataset_id, grid.rows, grid.cols, grid.resolution_m)
    return grid


class TerrainStore:
    """Holds the loaded grids, best-resolution first."""

    def __init__(self) -> None:
        self.grids: list[Grid] = []

    def load(self) -> None:
        from app.data import registry

        self.grids = []
        for ds_id in ("ctx_dtm_jezero_20m", "hrsc_mola_blend_200m", "mola_dem_463m"):
            ds = registry.get_dataset(ds_id)
            p = settings.data_dir / ds.local_file
            if p.exists():
                try:
                    g = prepare_derivatives(load_geotiff(p, ds_id))
                    g.reliability = ds.reliability.value
                    self.grids.append(g)
                except Exception as exc:  # noqa: BLE001
                    log.error("failed to load %s: %s", ds_id, exc)
        if not self.grids:
            log.warning("no terrain grids available - run `python -m app.data.ingest --terrain`")

    @property
    def primary(self) -> Grid | None:
        return self.grids[0] if self.grids else None

    def best_for(self, lon: float, lat: float) -> Grid | None:
        for g in self.grids:
            if g.contains(lon, lat) and np.isfinite(g.elevation(lon, lat)):
                return g
        return None

    def best_for_bbox(self, west: float, south: float, east: float, north: float) -> Grid | None:
        for g in self.grids:
            if g.west <= west and g.east >= east and g.south <= south and g.north >= north:
                return g
        for g in self.grids:  # partial overlap fallback
            if g.window(west, south, east, north):
                return g
        return None

    def get(self, dataset_id: str) -> Grid | None:
        return next((g for g in self.grids if g.dataset_id == dataset_id), None)


store = TerrainStore()


# ----------------------------------------------------------------------------- geometry helpers
def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi, dl = p2 - p1, np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return float(2 * MARS_R * np.arcsin(np.sqrt(a)))


def inspect_point(lon: float, lat: float, th: Thresholds) -> dict:
    """Everything we know about a single location from the terrain grids."""
    g = store.best_for(lon, lat)
    if g is None:
        ctx = store.grids[-1] if store.grids else None
        return {"covered": False, "elevation_m": None, "slope_deg": None, "roughness_m": None, "terrain_class": None,
                "dataset_id": None, "resolution_m": None, "reliability": None,
                "note": "Outside terrain coverage" + (f" of {ctx.dataset_id}" if ctx else "")}
    elev = g.elevation(lon, lat)
    slope = g.sample(g.slope, lon, lat)
    rough = g.sample(g.roughness, lon, lat)
    fine = g.resolution_m <= ROUGHNESS_MAX_RES_M
    cls = classify(np.array([[slope]]), np.array([[rough]]) if fine else None, th)[0, 0]
    r, c = (int(v) for v in g.to_rc(lon, lat))
    win = g.slope[max(0, r - 12): r + 13, max(0, c - 12): c + 13]
    return {
        "covered": True, "elevation_m": round(elev, 1), "slope_deg": round(slope, 2) if np.isfinite(slope) else None,
        "roughness_m": round(rough, 2) if (fine and np.isfinite(rough)) else None,
        "roughness_resolved": fine,
        "terrain_class": CLASS_NAMES[cls] if cls != 255 else None,
        "local_slope_p90_deg": round(float(np.nanpercentile(win, 90)), 2) if np.isfinite(win).any() else None,
        "dataset_id": g.dataset_id, "resolution_m": g.resolution_m, "reliability": g.reliability,
        "note": None if g is store.primary else "Coarse context DEM; fine-scale hazards unresolved",
    }


def region_stats(west: float, south: float, east: float, north: float, th: Thresholds, polygon: list[list[float]] | None = None) -> dict:
    """Statistics of slope/roughness/elevation in a bbox (optionally clipped to a lon/lat polygon)."""
    g = store.best_for_bbox(west, south, east, north)
    if g is None:
        return {"covered": False, "coverage_fraction": 0.0, "dataset_id": None}
    win = g.window(west, south, east, north)
    if win is None:
        return {"covered": False, "coverage_fraction": 0.0, "dataset_id": g.dataset_id}
    dem, slope, rough = g.data[win], g.slope[win], g.roughness[win]
    mask = np.ones(dem.shape, dtype=bool)
    if polygon and len(polygon) >= 3:
        from matplotlib.path import Path as MPath

        rr, cc = np.mgrid[win[0].start: win[0].stop, win[1].start: win[1].stop]
        lon = g.west + (cc + 0.5) * g.dlon
        lat = g.north - (rr + 0.5) * g.dlat
        mask = MPath(polygon).contains_points(np.c_[lon.ravel(), lat.ravel()]).reshape(dem.shape)
    requested = int(mask.sum())
    # fraction of the *requested* bbox actually inside the grid
    r0, c0 = g.to_rc(west, north)
    r1, c1 = g.to_rc(east, south)
    area_km2 = 0.0
    bbox_px = max(1.0, (r1 - r0) * (c1 - c0))
    inside_frac = min(1.0, requested / bbox_px) if polygon is None else 1.0
    fine = g.resolution_m <= ROUGHNESS_MAX_RES_M
    valid = mask & np.isfinite(slope) & (np.isfinite(rough) if fine else True)
    n_valid = int(valid.sum())
    coverage = (n_valid / requested if requested else 0.0) * inside_frac
    if n_valid == 0:
        return {"covered": False, "coverage_fraction": 0.0, "dataset_id": g.dataset_id}
    cls = classify(slope, rough if fine else None, th)
    cls_valid = cls[valid]
    fractions = {name: float((cls_valid == i).mean()) for i, name in enumerate(CLASS_NAMES)}
    s, r, z = slope[valid], rough[valid], dem[valid]
    # obstacle proxy: local TRI maxima above hazard threshold
    peaks = (rough == ndimage.maximum_filter(np.nan_to_num(rough, nan=-1), size=5)) & (np.nan_to_num(rough, nan=0) > th.rough_hazard) & valid
    dx, dy = g.pixel_size_m()
    area_km2 = n_valid * dx * dy / 1e6
    traversable = fractions["benign"] + fractions["caution"]
    return {
        "covered": True, "dataset_id": g.dataset_id, "resolution_m": g.resolution_m, "reliability": g.reliability,
        "coverage_fraction": round(coverage, 3), "n_pixels": n_valid, "area_km2": round(area_km2, 2),
        "elevation": {"min": float(z.min()), "max": float(z.max()), "mean": float(z.mean()), "relief": float(z.max() - z.min())},
        "slope_deg": {"mean": float(s.mean()), "p50": float(np.percentile(s, 50)), "p90": float(np.percentile(s, 90)), "max": float(s.max())},
        "roughness_m": {"mean": float(r.mean()), "p50": float(np.percentile(r, 50)), "p90": float(np.percentile(r, 90)), "max": float(r.max())} if fine else None,
        "roughness_resolved": fine,
        "class_fractions": fractions,
        "obstacle_density_per_km2": round(float(peaks.sum()) / area_km2, 2) if (fine and area_km2 > 0) else None,
        "traversability_index": round(traversable * (0.5 + 0.5 * coverage), 3),
        "thresholds": th.__dict__,
    }


def elevation_profile(points: list[tuple[float, float]], step_m: float = 20.0) -> dict:
    """Sample elevation/slope along a polyline (lon, lat) at <= step_m spacing."""
    dist, out = 0.0, []
    for (lon0, lat0), (lon1, lat1) in zip(points[:-1], points[1:]):
        seg = haversine_m(lon0, lat0, lon1, lat1)
        n = max(1, int(np.ceil(seg / step_m)))
        for i in range(n + (1 if (lon1, lat1) == points[-1] else 0)):
            f = i / n
            lon, lat = lon0 + f * (lon1 - lon0), lat0 + f * (lat1 - lat0)
            g = store.best_for(lon, lat)
            z = g.elevation(lon, lat) if g else float("nan")
            s = g.sample(g.slope, lon, lat) if g else float("nan")
            out.append({"d": round(dist + f * seg, 1), "lon": lon, "lat": lat,
                        "z": round(z, 1) if np.isfinite(z) else None, "slope": round(s, 1) if np.isfinite(s) else None,
                        "src": g.dataset_id if g else None})
        dist += seg
    zs = [p["z"] for p in out if p["z"] is not None]
    climb = sum(max(0, b - a) for a, b in zip(zs[:-1], zs[1:]))
    descent = sum(max(0, a - b) for a, b in zip(zs[:-1], zs[1:]))
    return {"samples": out, "length_m": round(dist, 1), "climb_m": round(climb, 1), "descent_m": round(descent, 1),
            "coverage_fraction": round(len(zs) / len(out), 3) if out else 0.0}

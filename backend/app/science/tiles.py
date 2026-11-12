"""Render XYZ PNG tiles (geographic tiling, 2x1 at zoom 0 - same scheme as Trek/Cesium) from terrain grids."""

from __future__ import annotations

import io
from functools import lru_cache

import numpy as np
from matplotlib import colors
from PIL import Image

from app.science import terrain as T

ELEV_CMAP = colors.LinearSegmentedColormap.from_list(
    "elev", [(0.0, "#1b1e4b"), (0.09, "#2f5b9f"), (0.18, "#3fa7a0"), (0.27, "#8fcf6b"), (0.45, "#e8d86a"), (0.63, "#d9823b"), (0.8, "#a63d2f"), (1.0, "#f4f1ec")]
)
ELEV_RANGE = (-2700.0, -1500.0)

SLOPE_BOUNDS = [0, 5, 10, 15, 20, 30, 90]
SLOPE_COLORS = ["#1f7a4d", "#7bc96f", "#e6d84d", "#f0a12b", "#e2571f", "#8c1a1a"]
ROUGH_BOUNDS = [0, 1.5, 3, 4, 8, 1e9]
ROUGH_COLORS = ["#122a3a", "#2b7a9e", "#e6d84d", "#e2571f", "#8c1a1a"]


def tile_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    n = 2 ** z
    size = 180.0 / n  # degrees per tile (2 x 1 tiles at z=0)
    west = -180.0 + x * size
    north = 90.0 - y * size
    return west, north - size, west + size, north


def _resample(grid: T.Grid, arr: np.ndarray, west: float, south: float, east: float, north: float, size: int = 256) -> np.ndarray | None:
    """Nearest-neighbour resample of `arr` onto a size x size tile covering the bounds. NaN outside."""
    if east <= grid.west or west >= grid.east or north <= grid.south or south >= grid.north:
        return None
    lons = west + (np.arange(size) + 0.5) * (east - west) / size
    lats = north - (np.arange(size) + 0.5) * (north - south) / size
    cols = np.floor((lons - grid.west) / grid.dlon).astype(int)
    rows = np.floor((grid.north - lats) / grid.dlat).astype(int)
    out = np.full((size, size), np.nan, dtype=np.float32)
    cm = (cols >= 0) & (cols < grid.cols)
    rm = (rows >= 0) & (rows < grid.rows)
    if not cm.any() or not rm.any():
        return None
    sub = arr[np.ix_(rows[rm], cols[cm])]
    # when the tile is much larger than the pixel, average blocks for smoother overview tiles
    out[np.ix_(rm, cm)] = sub
    return out


def _png(rgba: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buf, format="PNG", optimize=False, compress_level=3)
    return buf.getvalue()


EMPTY_PNG = _png(np.zeros((1, 1, 4), dtype=np.uint8))


def _classed(vals: np.ndarray, bounds: list[float], cols: list[str]) -> np.ndarray:
    idx = np.clip(np.digitize(np.nan_to_num(vals, nan=0.0), bounds[1:-1]), 0, len(cols) - 1)
    lut = np.array([colors.to_rgba(c) for c in cols]) * 255
    rgba = lut[idx].astype(np.uint8)
    rgba[..., 3] = np.where(np.isfinite(vals), 255, 0).astype(np.uint8)
    return rgba


@lru_cache(maxsize=4096)
def render_tile(layer: str, z: int, x: int, y: int) -> bytes:
    grid = T.store.primary
    if grid is None:
        return EMPTY_PNG
    west, south, east, north = tile_bounds(z, x, y)
    if layer == "elevation":
        arr = grid.data
    elif layer == "slope":
        arr = grid.slope
    elif layer == "roughness":
        arr = grid.roughness
    else:
        raise KeyError(layer)
    vals = _resample(grid, arr, west, south, east, north)
    if vals is None or not np.isfinite(vals).any():
        return EMPTY_PNG
    if layer == "elevation":
        norm = (np.nan_to_num(vals, nan=ELEV_RANGE[0]) - ELEV_RANGE[0]) / (ELEV_RANGE[1] - ELEV_RANGE[0])
        rgba = (ELEV_CMAP(np.clip(norm, 0, 1)) * 255).astype(np.uint8)
        # subtle hillshade modulation for readability
        gy, gx = np.gradient(np.nan_to_num(vals, nan=np.nanmean(vals)))
        shade = np.clip(1.0 + 0.012 * (gx - gy), 0.75, 1.25)
        rgba[..., :3] = np.clip(rgba[..., :3] * shade[..., None], 0, 255).astype(np.uint8)
        rgba[..., 3] = np.where(np.isfinite(vals), 255, 0).astype(np.uint8)
    elif layer == "slope":
        rgba = _classed(vals, SLOPE_BOUNDS, SLOPE_COLORS)
    else:
        rgba = _classed(vals, ROUGH_BOUNDS, ROUGH_COLORS)
    return _png(rgba)

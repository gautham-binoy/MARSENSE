"""Ingestion pipeline for the Jezero dataset bundle.

Run with `uv run python -m app.data.ingest [--all|--terrain|--rover|--meda|--rad]`.
Everything is idempotent and cached under data/raw, data/processed, data/cache.
"""

from __future__ import annotations

import json
import logging
import re
import sys
from pathlib import Path

import numpy as np

from app.config import settings
from app.data import registry
from app.data.nasa_client import (
    RemoteUnavailable,
    download_file,
    fetch_text,
    list_directory,
)

log = logging.getLogger("marsense.ingest")

MARS_R = 3396190.0
MEDA_BASE = "https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_calibrated_env/"
RAD_BASE = "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/"
M20_BASE = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/"
MSL_BASE = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/"


# ----------------------------------------------------------------------------- terrain
def ingest_ctx_dtm() -> Path:
    ds = registry.get_dataset("ctx_dtm_jezero_20m")
    return download_file(ds.access_url, settings.data_dir / ds.local_file, max_mb=50)


def ingest_context_dem(bbox=(76.0, 17.0, 79.0, 20.0)) -> Path:
    """Windowed read of the global HRSC/MOLA blend COG (falls back to MOLA 463 m)."""
    import rasterio
    from rasterio.windows import from_bounds

    for ds_id in ("hrsc_mola_blend_200m", "mola_dem_463m"):
        ds = registry.get_dataset(ds_id)
        dest = settings.data_dir / ds.local_file
        if dest.exists():
            return dest
        if settings.offline:
            continue
        try:
            with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
                with rasterio.open(f"/vsicurl/{ds.access_url}") as src:
                    # Both products are equirectangular on the Mars 2000 sphere: x = R*lon(rad), y = R*lat(rad)
                    w, s, e, n = bbox
                    k = 1.0 if src.crs.is_geographic else MARS_R * np.pi / 180.0
                    win = from_bounds(w * k, s * k, e * k, n * k, src.transform)
                    win = win.round_offsets().round_lengths()
                    # Striped (non-tiled) COGs force full-row reads; refuse pathological transfers.
                    bh, bw = src.block_shapes[0]
                    est_bytes = win.height * (bw if bh == 1 else win.width) * np.dtype(src.dtypes[0]).itemsize
                    if est_bytes > 60e6:
                        raise RemoteUnavailable(f"window would transfer ~{est_bytes/1e6:.0f} MB (non-tiled source)")
                    data = src.read(1, window=win)
                    transform = src.window_transform(win)
                    profile = src.profile.copy()
                    profile.update(height=data.shape[0], width=data.shape[1], transform=transform, driver="GTiff",
                                   compress="deflate", tiled=False)
                    profile.pop("blockxsize", None)
                    profile.pop("blockysize", None)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with rasterio.open(dest, "w", **profile) as dst:
                        dst.write(data, 1)
            log.info("context DEM window saved: %s %s", dest.name, data.shape)
            return dest
        except Exception as exc:  # noqa: BLE001
            log.warning("context DEM %s skipped: %s", ds_id, exc)
    raise RemoteUnavailable("no context DEM available")


# ----------------------------------------------------------------------------- rovers
def ingest_rover_tracks() -> dict[str, Path]:
    out = {}
    for name, url in {
        "M20_traverse.json": M20_BASE + "M20_traverse.json",
        "M20_waypoints.json": M20_BASE + "M20_waypoints.json",
        "M20_waypoints_current.json": M20_BASE + "M20_waypoints_current.json",
        "MSL_waypoints_current.json": MSL_BASE + "MSL_waypoints_current.json",
    }.items():
        try:
            text = fetch_text(url, name, max_age_s=86400)
            dest = settings.raw_dir / name
            dest.write_text(text)
            out[name] = dest
        except RemoteUnavailable as exc:
            log.warning("rover track %s unavailable: %s", name, exc)
    return out


# ----------------------------------------------------------------------------- MEDA
def _meda_group(sol: int) -> str | None:
    groups = list_directory(MEDA_BASE, "meda_groups.html")
    for g in groups:
        m = re.match(r"sol_(\d+)_(\d+)/", g)
        if m and int(m.group(1)) <= sol <= int(m.group(2)):
            return g
    return None


def _sclk_to_utc(sclk: float) -> str:
    """Mars 2020 SCLK epoch is 2000-01-01T11:58:55.816 UTC (J2000, ~1 s/s). Good to ~1 min for display."""
    import datetime as dt

    epoch = dt.datetime(2000, 1, 1, 11, 58, 55, 816000, tzinfo=dt.UTC)
    return (epoch + dt.timedelta(seconds=float(sclk))).strftime("%Y-%m-%d")


def ingest_meda(sols: list[int] | None = None) -> Path:
    sols = sols or settings.meda_sample_sols
    out_path = settings.processed_dir / "meda_summary.json"
    existing = json.loads(out_path.read_text()) if out_path.exists() else {"records": []}
    done = {r["sol"] for r in existing["records"]}
    records = existing["records"]
    for sol in sols:
        if sol in done:
            continue
        try:
            group = _meda_group(sol)
            if not group:
                continue
            sol_dir = f"{MEDA_BASE}{group}sol_{sol:04d}/"
            files = list_directory(sol_dir, f"meda_sol_{sol:04d}.html")
            rec: dict = {"sol": sol, "source_dir": sol_dir}
            for kind, key in (("PS", "pressure"), ("ATS", "air_temperature")):
                fname = next((f for f in files if f"CAL_{kind}_" in f and f.endswith(".CSV")), None)
                if not fname:
                    continue
                raw = settings.raw_dir / "meda" / fname
                download_file(sol_dir + fname, raw, max_mb=20)
                rec[key] = _summarise_meda_csv(raw, kind)
            if "pressure" in rec or "air_temperature" in rec:
                records.append(rec)
                log.info("MEDA sol %d ingested", sol)
        except RemoteUnavailable as exc:
            log.warning("MEDA sol %d unavailable: %s", sol, exc)
    records.sort(key=lambda r: r["sol"])
    out_path.write_text(json.dumps({"dataset_id": "m20_meda", "records": records}, indent=1))
    return out_path


def _summarise_meda_csv(path: Path, kind: str) -> dict:
    import csv

    with path.open() as f:
        rows = list(csv.DictReader(f))
    if not rows:
        return {}
    if kind == "PS":
        cols = [c for c in rows[0] if re.match(r"BAROCAP\d_PRESSURE$", c)]
        unit = "Pa"
    else:
        cols = [c for c in rows[0] if re.match(r"ATS_LOCAL_TEMP\d$", c)]
        unit = "K"
    vals = []
    for row in rows:
        for c in cols:
            try:
                v = float(row[c])
                if v > 0:
                    vals.append(v)
            except (ValueError, KeyError):
                pass
    arr = np.array(vals, dtype=float)
    sclk = [float(r["SCLK"]) for r in rows if r.get("SCLK")]
    return {
        "file": path.name, "unit": unit, "sensors": cols, "n_samples": int(arr.size),
        "min": float(arr.min()) if arr.size else None, "max": float(arr.max()) if arr.size else None,
        "mean": float(arr.mean()) if arr.size else None,
        "ltst_start": rows[0].get("LTST"), "ltst_end": rows[-1].get("LTST"),
        "earth_date": _sclk_to_utc(sclk[0]) if sclk else None,
    }


# ----------------------------------------------------------------------------- RAD
def ingest_rad(sols: list[int] | None = None) -> Path:
    sols = sols or settings.rad_sample_sols
    out_path = settings.processed_dir / "rad_summary.json"
    existing = json.loads(out_path.read_text()) if out_path.exists() else {"records": []}
    done = {r["sol"] for r in existing["records"]}
    records = existing["records"]
    groups = list_directory(RAD_BASE, "rad_groups.html")
    for sol in sols:
        if sol in done:
            continue
        group = next((g for g in groups if (m := re.match(r"SOL_(\d+)_(\d+)/", g)) and int(m.group(1)) <= sol <= int(m.group(2))), None)
        if not group:
            continue
        try:
            files = list_directory(RAD_BASE + group, f"rad_{group.strip('/')}.html")
            fname = next((f for f in files if re.match(rf"RAD_RDR_\d{{4}}_\d{{3}}_\d\d_\d\d_{sol:04d}_V\d\d\.TXT$", f)), None)
            if not fname:
                continue
            raw = settings.raw_dir / "rad" / fname
            download_file(RAD_BASE + group + fname, raw, max_mb=60)
            rec = parse_rad_rdr(raw)
            rec["sol"] = sol
            rec["file"] = fname
            records.append(rec)
            log.info("RAD sol %d ingested (%d obs)", sol, rec["n_observations"])
        except RemoteUnavailable as exc:
            log.warning("RAD sol %d unavailable: %s", sol, exc)
    records.sort(key=lambda r: r["sol"])
    out_path.write_text(json.dumps({"dataset_id": "msl_rad", "records": records}, indent=1))
    return out_path


def parse_rad_rdr(path: Path) -> dict:
    """Extract total dose rates (µGy/h, RAD RDR SIS 4.2.1.6) and observation times from an RDR text product."""
    text = path.read_text(errors="ignore")
    start_utc = re.search(r'START_TIME="([^"]+)"', text)
    obs_times = re.findall(r'START_OBS_UTC="([^"]+)"', text)
    dose_b = [float(v) for v in re.findall(r"\[DOSIMETRY_TOTAL_DOSE_B: \d+\]\s+([-\d.eE+]+)", text)]
    dose_e = [float(v) for v in re.findall(r"\[DOSIMETRY_TOTAL_DOSE_E: \d+\]\s+([-\d.eE+]+)", text)]
    b = np.array([v for v in dose_b if v > 0], dtype=float)
    e = np.array([v for v in dose_e if v > 0], dtype=float)

    def stats(a: np.ndarray) -> dict | None:
        if a.size == 0:
            return None
        return {"mean": float(a.mean()), "min": float(a.min()), "max": float(a.max()), "n": int(a.size)}

    return {
        "start_utc": start_utc.group(1) if start_utc else None,
        "n_observations": len(obs_times),
        "dose_rate_B_uGy_h": stats(b),
        "dose_rate_E_uGy_h": stats(e),
        "unit": "µGy/h",
    }


# ----------------------------------------------------------------------------- status
def dataset_status(ds: registry.Dataset) -> dict:
    if ds.local_file:
        p = settings.data_dir / ds.local_file
        if p.exists():
            return {"status": "cached", "size_bytes": p.stat().st_size, "path": ds.local_file}
        return {"status": "not_downloaded", "size_bytes": 0, "path": ds.local_file}
    return {"status": "streamed", "size_bytes": 0, "path": None}


def run_all() -> None:
    for fn in (ingest_ctx_dtm, ingest_context_dem, ingest_rover_tracks, ingest_meda, ingest_rad):
        try:
            fn()
        except RemoteUnavailable as exc:
            log.warning("%s: %s", fn.__name__, exc)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = set(sys.argv[1:]) or {"--all"}
    if "--all" in args:
        run_all()
    if "--terrain" in args:
        ingest_ctx_dtm()
        ingest_context_dem()
    if "--rover" in args:
        ingest_rover_tracks()
    if "--meda" in args:
        ingest_meda()
    if "--rad" in args:
        ingest_rad()

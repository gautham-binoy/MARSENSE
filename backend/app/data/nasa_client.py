"""Centralised NASA/USGS data access with caching, size limits and offline mode.

All remote I/O in the backend goes through this module so that provenance, caching and
download limits are enforced in one place.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

import httpx

from app.config import settings

log = logging.getLogger("marsense.nasa")

USER_AGENT = "MARSENSE/0.1 (research prototype; https://github.com/)"


class RemoteUnavailable(RuntimeError):
    pass


def _client() -> httpx.Client:
    return httpx.Client(timeout=httpx.Timeout(60.0, connect=20.0), follow_redirects=True, headers={"User-Agent": USER_AGENT})


def download_file(url: str, dest: Path, *, max_mb: int | None = None, force: bool = False) -> Path:
    """Download `url` to `dest` unless it already exists. Enforces a size cap and offline mode."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not force:
        return dest
    if settings.offline:
        raise RemoteUnavailable(f"offline mode: {dest.name} not cached")
    cap = (max_mb or settings.max_download_mb) * 1024 * 1024
    tmp = dest.with_suffix(dest.suffix + ".part")
    t0 = time.time()
    with _client() as c, c.stream("GET", url) as r:
        if r.status_code != 200:
            raise RemoteUnavailable(f"{url} -> HTTP {r.status_code}")
        length = int(r.headers.get("content-length") or 0)
        if length > cap:
            raise RemoteUnavailable(f"{url} is {length/1e6:.1f} MB, above cap {cap/1e6:.0f} MB")
        n = 0
        with tmp.open("wb") as f:
            for chunk in r.iter_bytes(1 << 16):
                n += len(chunk)
                if n > cap:
                    tmp.unlink(missing_ok=True)
                    raise RemoteUnavailable(f"{url} exceeded cap while streaming")
                f.write(chunk)
    tmp.replace(dest)
    _record_fetch(dest, url, n, time.time() - t0)
    log.info("downloaded %s (%.1f MB) in %.1fs", dest.name, n / 1e6, time.time() - t0)
    return dest


def fetch_text(url: str, cache_name: str, *, max_age_s: float | None = None) -> str:
    """Fetch small text/JSON with disk cache in data/cache."""
    cache = settings.cache_dir / cache_name
    if cache.exists():
        age = time.time() - cache.stat().st_mtime
        if max_age_s is None or age < max_age_s or settings.offline:
            return cache.read_text()
    if settings.offline:
        raise RemoteUnavailable(f"offline mode: {cache_name} not cached")
    with _client() as c:
        r = c.get(url)
        if r.status_code != 200:
            if cache.exists():
                return cache.read_text()
            raise RemoteUnavailable(f"{url} -> HTTP {r.status_code}")
        cache.write_text(r.text)
        _record_fetch(cache, url, len(r.content), 0)
        return r.text


def list_directory(url: str, cache_name: str) -> list[str]:
    """Parse an Apache-style index page into hrefs (used for PDS directory walking)."""
    import re

    html = fetch_text(url, cache_name, max_age_s=7 * 86400)
    return [h for h in re.findall(r'href="([^"?][^"]*)"', html) if not h.startswith("/")]


def _record_fetch(path: Path, url: str, size: int, seconds: float) -> None:
    rec = settings.metadata_dir / "fetch_log.jsonl"
    with rec.open("a") as f:
        f.write(json.dumps({"file": str(path.relative_to(settings.data_dir)), "url": url, "bytes": size,
                            "seconds": round(seconds, 2), "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}) + "\n")


def fetch_log() -> list[dict]:
    rec = settings.metadata_dir / "fetch_log.jsonl"
    if not rec.exists():
        return []
    return [json.loads(line) for line in rec.read_text().splitlines() if line.strip()]

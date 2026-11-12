# MARSENSE Project Plan

Primary region: Jezero Crater (Mars 2020 landing site). Architecture is region-agnostic (`regions` table + per-region dataset bundles).

## Stage 1 — Research & architecture  ✅
- Verified live NASA/USGS endpoints (see DATA_SOURCES.md): Trek WMTS, USGS COGs with HTTP range support, Mars 2020 CTX DTM (9.3 MB), MMGIS traverse JSON, MEDA PDS4 CSVs, RAD RDR text products.
- Chosen data bundle for Jezero v1: CTX DTM 20 m (analysis), HRSC-MOLA 200 m window (context), Trek imagery (Viking, MOLA shade, THEMIS, geology, Jezero CTX/HiRISE), Perseverance traverse, MEDA, RAD, curated targets + mineral evidence.
- Docs: ARCHITECTURE.md, DATA_SOURCES.md, SCIENTIFIC_METHODOLOGY.md.

## Stage 2 — Foundation
- Backend: uv project (Python 3.12), FastAPI app, settings, SQLite/PostGIS via SQLAlchemy, dataset registry, layer catalogue, NASA client + ingestion CLI.
- Frontend: Vite + React + TS + Tailwind v4 + shadcn/ui + Cesium (Mars ellipsoid), design tokens, app shell with sidebar navigation, status bar.

## Stage 3 — Mars Explorer
- Cesium globe with Trek WMTS basemaps; Jezero fly-to; layer manager (toggle/opacity/legend/metadata); backend-rendered elevation/slope/roughness tiles; click inspector (`/api/locations/inspect`); bookmarks.

## Stage 4 — Scientific intelligence
- Terrain analysis API + UI (bbox/polygon analysis, thresholds, class histogram, profile).
- Landing-site comparison with weights and explanations.
- Resource evidence module; environment module (MEDA/RAD charts); science discovery mode.

## Stage 5 — Mission planning
- A* route planner with three strategies, hazard segments, elevation profile, alternatives comparison, mission save/load.

## Stage 6 — Survival & assessment
- Survival simulator with scenarios and warnings; mission assessment engine with category scores and confidence.

## Stage 7 — Final experience
- PDF report (ReportLab), methodology page, tests (pytest, vitest, Playwright), Docker Compose, README, LIMITATIONS.

## Out of scope for v1 (documented in LIMITATIONS.md)
HiRISE 1 m DTMs, CRISM cube processing, real-time weather, multi-user auth, additional regions' data bundles (schema supports them).

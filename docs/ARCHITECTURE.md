# MARSENSE Architecture

```
frontend/   React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui + CesiumJS + Recharts
backend/    FastAPI + Pydantic v2 + SQLAlchemy 2 + NumPy/SciPy/Rasterio/Shapely/PyProj + ReportLab
data/       raw/ (downloads, git-ignored) processed/ (derived rasters/JSON) metadata/ (curated, committed) cache/
docs/       project documentation
scripts/    ingestion and dev helpers
tests/      Playwright end-to-end tests
```

## Backend (`backend/app`)

```
app/
  main.py              FastAPI app factory, CORS, routers, lifespan (loads terrain into memory)
  config.py            pydantic-settings (DATABASE_URL, DATA_DIR, OFFLINE, ...)
  db.py                SQLAlchemy engine/session; SQLite by default, PostgreSQL/PostGIS when DATABASE_URL set
  models.py            ORM: Region, Mission, MissionRoute, RouteWaypoint, ResourceConfiguration,
                       SurvivalSimulation, MissionAssessment, BookmarkedLocation
  schemas/             Pydantic request/response models per module
  data/
    registry.py        Dataset registry (metadata + reliability class + attribution) -> /api/datasets
    layers.py          Map-layer catalogue (WMTS templates, rectangles, legends) -> /api/layers
    nasa_client.py     Centralised NASA HTTP client (httpx, caching, size limits, offline mode)
    ingest.py          Ingestion pipeline: CTX DTM, HRSC window, traverse, MEDA, RAD
    provenance.py      Provenance records attached to every analytical response
  science/             Pure scientific code (no HTTP):
    terrain.py         DEM loading, slope, roughness, TRI, classification, profiles, region stats
    tiles.py           Raster -> PNG XYZ tiles (elevation/slope/roughness) with colour ramps
    routing.py         A*/Dijkstra over a cost grid built from slope + roughness + hazards
    landing.py         Explainable multi-criteria landing-site scoring
    resources.py       Mineral / water evidence lookup
    environment.py     MEDA / RAD summaries
    survival.py        Resource consumption simulator and scenario engine
    assessment.py      Mission feasibility engine (category scores + confidence)
    report.py          PDF report builder (ReportLab + Matplotlib)
  api/                 Routers: regions, datasets, layers, locations, terrain, landing, resources,
                       environment, routes, survival, missions, science, bookmarks, reports, tiles
```

Design rules:
- Scientific code in `app/science` never imports FastAPI; routers only validate, call, and serialise.
- Every analytical response includes `provenance: [{dataset_id, reliability, method, ...}]`.
- Terrain grids are loaded once (CTX DTM ~1596x1512 float32 = 9.6 MB; HRSC window ~1000x1000) and kept in process memory, with slope/roughness computed at start-up and cached as `.npy` in `data/processed`.
- Expensive requests (routing, region analysis) run in a thread pool (`run_in_threadpool`) so the event loop stays responsive.
- Coordinates: API uses planetocentric lat/lon degrees east (IAU Mars 2000 sphere, R=3 396 190 m) — identical to the DTM, Trek and MMGIS data. Distances use a spherical Mars.

## Database
- Default: SQLite file `data/marsense.db` (zero-setup local dev). Geometry stored as GeoJSON text + lat/lon columns.
- Production: `DATABASE_URL=postgresql+psycopg://...` with the PostGIS image in `docker-compose.yml`. Spatial queries at the current
  data scale are done in NumPy/Shapely on the server; PostGIS is used for persistence and future scaling, not required for any feature.

## Frontend (`frontend/src`)

```
app/             router, layout shell (sidebar, top status bar), providers
components/ui/   shadcn primitives (button, card, tabs, slider, switch, dialog, tooltip, badge ...)
components/      ReliabilityBadge, ProvenancePanel, Legend, StatTile, ...
features/
  mission-control/   Globe dashboard
  explorer/          Cesium viewer, layer manager, click inspector, bookmarks
  terrain/           Region analysis + profiles
  landing/           Candidate comparison with weight sliders
  resources/         Evidence map/list
  environment/       MEDA / RAD charts
  routes/            Route planner UI, alternatives, profile chart
  survival/          Simulator config + timeline charts
  assessment/        Mission score
  science/           Discovery mode
  methodology/       Methodology & sources page
lib/api.ts       typed fetch wrappers; lib/cesium/ Mars ellipsoid + WMTS providers
store/           zustand stores: mission plan (region, base, targets, route, resources), map state
```

- Cesium is configured with the Mars ellipsoid (`Ellipsoid.default`), no Ion token, imagery from Trek WMTS via `WebMapTileServiceImageryProvider` with `GeographicTilingScheme`, and derived rasters from the backend tile endpoint via `UrlTemplateImageryProvider`.
- The mission plan is a single client-side store persisted to localStorage and saved to the backend (`/api/missions`) on demand, so the route → survival → assessment → report chain always operates on one consistent plan.

## Request flow example (route planning)
1. UI posts `{start, end, waypoints, strategy, constraints}` to `POST /api/routes/plan`.
2. Router validates, calls `science.routing.plan_route(grid, ...)` in a threadpool.
3. Routing builds a cost grid (slope, roughness, no-data mask), runs A* with octile heuristic, densifies the path, samples the elevation profile, flags hazard segments, returns distance/time estimates and `coverage` (fraction of path on valid DTM pixels).
4. Response includes provenance (`ctx_dtm_jezero_20m`, `derived`) and `verified: false` if any part leaves DTM coverage.

## Deployment
- `docker-compose.yml`: `db` (postgis/postgis:16), `backend` (uvicorn), `frontend` (nginx static build proxying `/api`).
- Local: `uv run uvicorn app.main:app --reload` and `npm run dev` (Vite proxies `/api` to :8000).

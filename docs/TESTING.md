# MARSENSE — Automated Testing Suite & Verification Guide

**Project:** MARSENSE – The Martian Survival Navigator  
**Total Automated Tests:** **52 / 52 Passing**  
- **Backend Tests (Pytest):** 20 tests  
- **Frontend Unit Tests (Vitest):** 17 tests  
- **End-to-End Tests (Playwright):** 15 tests  

---

## 1. Testing Strategy & Philosophy

MARSENSE enforces a multi-tiered testing strategy ensuring that every layer of the software stack — from mathematical finite-difference routines to headless browser rendering — is verified before deployment:

```
[Layer 3: Playwright E2E Tests]       Full browser user workflows across 11 pages (15 tests)
              ▲
[Layer 2: Frontend Vitest Unit Tests] Zustand stores, Mars chronometry, GeoJSON/GPX (17 tests)
              ▲
[Layer 1: Backend Pytest Integration] Horn slope, Riley TRI, A* pathfinding, BVAD (20 tests)
```

### Scientific Verification Guarantees
1. **Mathematical Invariants:** Slope vectors must obey $\theta \in [0^\circ, 90^\circ]$; Riley TRI must be non-negative; A* paths must be strictly continuous without diagonal teleports.
2. **Mass-Balance Conservation:** Human consumable consumption cannot exceed initial payload plus synthesis, and reserve breaches must trigger severity warnings.
3. **DTM Boundary Adherence:** Routes venturing outside the 20m CTX raster must be flagged with `verified: false`.
4. **Data Honesty:** No synthetic or mock data is substituted when authentic NASA datasets are queried.

---

## 2. Test Suites Overview

### 2.1 Backend Pytest Suite (`backend/tests/`)

| Test File | Tests | Focus Areas |
|---|:---:|---|
| `test_terrain.py` | 7 | Horn (1981) 3x3 finite differences, Riley (1999) TRI, regional bounding-box statistics, traversability indexing, inspect point lookups. |
| `test_routing.py` | 3 | 8-connected grid A* pathfinding, shortest vs balanced vs lowest-risk cost weighting, hazard segment boundaries, DTM edge checking. |
| `test_survival.py` | 4 | NASA BVAD 2022 hourly integration, oxygen/water/power/scrubber depletion curves, emergency reserve alarms, contingency multiplier adjustments. |
| `test_landing_and_assessment.py` | 3 | Multi-criteria factor weighting for candidate bases, 7-dimension feasibility scoring, safety capping rule overrides. |
| `test_api_endpoints.py` | 3 | `/api/health`, `/api/datasets`, `/api/layers`, `/api/reports/mission` (PDF `%PDF-1.4` byte header verification). |

**Execution Command:**
```bash
cd backend
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

---

### 2.2 Frontend Vitest Unit Suite (`frontend/src/`)

| Test File | Tests | Focus Areas |
|---|:---:|---|
| `lib/marsTime.test.ts` | 4 | Allison & McEwen (2000) NASA GISS algorithm: Julian Date, Mars Sol Date (MSD), Coordinated Mars Time (MTC), Local True Solar Time (LTST) for Jezero ($77.58^\circ\text{E}$), Solar Longitude ($L_s$), and Perihelion Dust Storm Window ($L_s \in [180^\circ, 330^\circ]$). |
| `lib/routeExport.test.ts` | 3 | GIS data serializers: 3D GeoJSON FeatureCollection generation, GPX track generation with elevation tags, and hazard segment annotations. |
| `store/mission.test.ts` | 6 | Zustand mission store: waypoint addition/removal, candidate bases, supply loadouts, profile toggles (rover vs astronaut). |
| `store/map.test.ts` | 3 | Map store: layer active/inactive states, opacity levels, click modes (inspect, base, candidate, route). |
| `lib/utils.test.ts` | 4 | Coordinate formatters (`fmt.coord`), distance units (`fmt.km`), class tone mappings. |

**Execution Command:**
```bash
cd frontend
npm run test
```

---

### 2.3 Playwright End-to-End Suite (`frontend/e2e/marsense.spec.ts`)

The end-to-end suite simulates authentic user navigation through a headless Chromium browser with software WebGL support:

1. **Mission Control:** Loads telemetry cards, rover status, and live Mars Chronometry HUD.
2. **Mars 3D Explorer:** Renders CesiumJS globe with IAU Mars 2000 ellipsoid and toggles layer drawer.
3. **Terrain Intelligence:** Executes bounding-box regional statistics, updates classification histograms, and verifies Horn/Riley values.
4. **Elevation Transect:** Samples 20m CTX DTM along a transect and renders cross-sectional elevation/slope charts.
5. **Landing Sites Matrix:** Evaluates candidate sites with dynamic factor weights and exports comparison CSV.
6. **Science Discovery:** Searches Mars 2020 targets, filters by geological formation, and adds targets to mission objectives.
7. **MSR Three Forks Depot:** Catalogs 10 sample tubes, selects cores, tracks mass, and adds depot to route planner.
8. **Resources Intelligence:** Details aqueous mineral evidence and verifies water-ice honesty disclosures.
9. **ISRU Chemical Plant:** Simulates MOXIE SOXE $O_2$ production, smectite pyrolysis $H_2O$, and augments active supplies.
10. **Environment Telemetry:** Displays Perseverance MEDA diurnal temperature/pressure curves and Curiosity RAD dosimetry.
11. **Route Planner:** Computes 8-connected A* traverse over 20m DTM and displays elevation profile cross-section.
12. **Survival Simulator:** Simulates BVAD 2022 mass balances, injects custom delays, and exports sol-by-sol CSV telemetry.
13. **Mission Assessment:** Evaluates 7-dimension feasibility scorecard and triggers PDF mission report download.
14. **Monte Carlo Risk Engine:** Executes 500 stochastic trials, evaluates failure modes, and benchmarks against NASA Category 1 Human-Rating threshold.
15. **Mission Vault Modal:** Saves active mission into SQLite database, displays score rings, and verifies flight plan JSON interchange.

**Execution Command:**
```bash
cd frontend
npm run e2e
```

---

## 3. Continuous Integration & Verification Commands

To run all test suites in sequence:

```bash
# 1. Backend tests
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests

# 2. Frontend unit tests
npm --prefix frontend run test

# 3. Frontend production build verification
npm --prefix frontend run build

# 4. Playwright End-to-End tests
npm --prefix frontend run e2e
```

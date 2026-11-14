# MARSENSE — Operator's Flight Manual & User Guide
### Official Operations Guide for Astronauts & Mission Control

**Document ID:** `NASA-MARSENSE-OPS-2026-V1`  
**Classification:** NASA Space Apps Challenge 2026 · Surface Operations Manual  
**Primary Target:** Jezero Crater, Mars ($18.38^\circ\text{N}, 77.58^\circ\text{E}$)  
**Compiled PDF Location:** [`docs/MARSENSE_OPERATIONS_MANUAL.pdf`](file:///home/titan/Projects/MARSENSE/docs/MARSENSE_OPERATIONS_MANUAL.pdf)  
**Live Download URL:** `http://localhost:5173/MARSENSE_OPERATIONS_MANUAL.pdf`  

---

## 📖 Executive Summary & Mission Scope

**MARSENSE** is an end-to-end mission planning, geospatial terrain intelligence, and astronaut survival navigation platform engineered for human surface operations on Mars. Centered on **Jezero Crater**, the platform directly answers NASA's central exploration question:

> *"Can astronauts safely explore a selected region of Mars, achieve their scientific objectives, manage their life-support resources, and return safely to base?"*

This manual provides flight directors, astronauts, and planetary science teams with complete operational instructions for every interactive function, algorithm, data layer, simulator, and export utility across the platform.

---

## 🛰️ Quick-Start 10-Step Mission Workflow

```
[1. Open Explorer] ──> [2. Inspect Terrain] ──> [3. Select Base Site] ──> [4. Choose Science Targets]
        │
        ▼
[5. Plan A* Route] ──> [6. Run BVAD Simulator] ──> [7. Test Contingency] ──> [8. Augment via ISRU]
        │
        ▼
[9. Monte Carlo Risk] ──> [10. Save in Vault & Download PDF Flight Plan]
```

---

## 1. Global Navigation Shell & Mars Chronometry HUD

The top navigation header remains visible across all screens and provides critical real-time planetary telemetry:

### 1.1 Allison & McEwen (2000) Mars Chronometry HUD
- **Sol Count:** Running Martian solar days since the Perseverance touchdown (Feb 18, 2021).
- **LTST (Local True Solar Time):** Exact solar hour angle calculated specifically for Jezero Crater ($77.58^\circ\text{E}$) including the Martian Equation of Time (EOT). `12:00:00 LTST` represents exact solar noon (peak photovoltaic output).
- **LMST (Local Mean Solar Time):** Mean solar time ignoring orbital eccentricity.
- **Solar Longitude ($L_s$):** Orbital position of Mars ($0^\circ–360^\circ$). $L_s = 0^\circ$ is Northern Spring Equinox; $L_s = 90^\circ$ is Northern Summer Solstice.
- **Perihelion Dust Storm Alert:** Automatically triggers during Southern Spring/Summer ($L_s \in [180^\circ, 330^\circ]$) when global and regional dust storm probability peaks.

### 1.2 Header Quick-Action Controls
- **Mission Vault Launcher:** Top-right folder button opens the SQLite database vault to save, reload, or exchange flight plans.
- **Region Status:** Confirms active focus on Jezero Crater.
- **System Health:** Monitored via `/api/health`, confirming 20m CTX DTM raster memory residency.

---

## 2. Module 1: Mission Control Dashboard (`/`)

### Purpose
The primary situational awareness hub summarizing mission status, active region boundaries, rover telemetries, and system warnings.

### Operating Instructions
1. **Fly to Jezero:** Click **"Fly to Jezero"** in the top-left floating card to transition camera view from orbit down into Jezero Crater.
2. **Review Warnings:** Review the *Active Warnings* card. Flags unselected habitat bases, unverified route terrain, and life-support reserve breaches.
3. **Track Ground Rovers:** Review telemetry for *Perseverance (M20)* and *Curiosity (MSL)*. Clicking any rover button commands the 3D camera to track to the rover's latest coordinates.
4. **Data Availability Audit:** Audit cached rasters, streamed layers, and in-situ records (MEDA/RAD).

---

## 3. Module 2: 3D Mars Planetary Explorer (`/explorer`)

### Purpose
Interactive 3D planetary GIS running on CesiumJS and the IAU Mars 2000 ellipsoid ($R = 3,396,190\ \text{m}$).

### Camera & Map Controls
- **Rotate / Pan:** Left-click and drag across the planetary surface.
- **Tilt / Pitch:** Right-click and drag vertically, or hold `Ctrl` + left-click drag.
- **Zoom:** Mouse scroll wheel.
- **Keyboard Shortcuts:**
  - `J`: Fly to Jezero Crater.
  - `R`: Reset to global orbital view.
  - `L`: Toggle layer drawer open/closed.

### Interactive Click Modes (Top-Left Bar)
1. **Inspect Mode (Crosshair):** Click anywhere on Mars to query:
   - Elevation ($m$ above MOLA areoid)
   - Horn (1981) Slope ($^\circ$)
   - Riley (1999) TRI Roughness ($m$)
   - Traversability Classification (*Benign*, *Caution*, *Hazardous*, *Impassable*)
   - Nearby peer-reviewed science targets within $10\ \text{km}$
   - Nearby aqueous mineral evidence within $5\ \text{km}$
2. **Base Mode (Home):** Click to set or reposition the expedition base.
3. **Candidate Mode (Target):** Click to register candidate locations into the Landing Sites decision matrix.
4. **Route Mode (Path):** Click successive points to manually plot route waypoints.

### Layer Drawer Management (Right Side)
- Toggle any of the 14 multi-spectral map layers: USGS CTX 6m mosaic, 20m CTX DTM, Horn slope heatmap, Riley TRI roughness, and Perseverance ground tracks.
- Adjust layer opacity ($5\%–100\%$) to blend orthomosaic textures with slope gradient color ramps.
- Click the info (`(i)`) icon on any layer to inspect dataset provenance, resolution, and scientific legends.

### Bookmarks Tool
- In the *Marks* tab, type a custom name and click **"Save"** to bookmark an inspected location.
- Click any saved bookmark to fly the camera directly back to that site.

---

## 4. Module 3: Terrain Intelligence & Micro-Topography (`/terrain`)

### Purpose
Evaluates topographical impedance, rock roughness, and traversability over the 20-meter DTM raster. Operates in two distinct modes.

### Mode 1: Regional Statistics & Classification
1. Select a preset region (*Western Delta Fan*, *Octavia E. Butler Landing Ellipse*, *South Séítah*, *Entire CTX Mosaic*) or input custom bounding box coordinates ($W, S, E, N$).
2. Choose mobility profile: **Rover Profile** (slopes $>15^\circ$ hazardous) or **Astronaut EVA Profile** (slopes $>20^\circ$ hazardous).
3. Click **"Recalculate"**.
4. Readouts generated:
   - **Traversability Index:** Passable percentage of the bounding box.
   - **Classification Distribution Chart:** Bar chart showing percentage split between Benign, Caution, Hazardous, and Impassable terrain.
   - **Topographic Relief:** Minimum, mean, and maximum elevations.
   - **Slope p90 / Max:** 90th percentile and peak slope gradients.
   - **Roughness (TRI p90):** Surface rock impedance.

### Mode 2: Interactive Elevation Transect Profile Tool
1. Click the **"Elevation Transect"** button in the header.
2. Select a preset transect (*Delta Scarp Ascent*, *Butler to Kodiak Butte*, *Neretva Breach*) or input custom Start and End coordinates ($^\circ\text{E}, ^\circ\text{N}$).
3. Select sampling step size: **10 m**, **20 m**, or **50 m**.
4. Click **"Calculate Profile"**.
5. Inspect the **Elevation Cross-Section AreaChart** and the **Local Slope Gradient LineChart** featuring the $15^\circ$ rollover threshold line.
6. Click **"Export CSV"** to download all sampled transect posts.

---

## 5. Module 4: Landing Site Decision Matrix (`/landing`)

### Purpose
Multi-criteria decision analysis scoring candidate human habitat sites across engineering touchdown safety and scientific accessibility.

### Operating Instructions
1. **Review Candidates:** Pre-loaded with *Octavia E. Butler*, *Western Delta Front Scarp*, *Belva Crater Margin*, and *South Séítah*.
2. **Tune Factor Weights:** Under the *Factor Weights* tab, adjust importance sliders for:
   - Surface Slope ($0–40\%$)
   - Rock Roughness ($0–30\%$)
   - Atmospheric Depth / Elevation ($0–20\%$)
   - Science Proximity ($0–30\%$)
   - Geological Interest ($0–20\%$)
   - Aqueous Mineral Evidence ($0–20\%$)
   - High-Res Data Coverage ($0–20\%$)
3. **Execute Comparison:** Click **"Compare Candidate Sites"**.
4. **Inspect Rankings:** Review ranked scores ($0–100$), radar factor bars, and engineering penalty flags.
5. **Set Base:** Click **"Set as Mission Base"** on the preferred candidate to bind its coordinates across the mission.
6. **Export CSV:** Click **"Export CSV"** in the header to download the complete scored decision matrix.

---

## 6. Module 5: Planetary Science & Three Forks MSR Depot (`/science`)

### Purpose
Scientific target directory cataloging peer-reviewed Jezero geological units and the authentic Three Forks Mars Sample Return (MSR) cache depot.

### Tab 1: Geological Target Directory
- **Search & Unit Filter:** Search targets by name or filter by geological class (*Delta Remnant*, *Carbonate Unit*, *Igneous Floor*, *River Channel*).
- **Target Dossier:** Displays astrobiological significance, priority rating ($1–5\bigstar$), petrological summary, instruments used, and distance from base.
- **Add to Objectives:** Click flag icon to tag as mission objective.
- **Add to Route:** Click **"+ Route"** to append target to the A* route queue.
- **Select 4★+:** Click **"Select 4★+"** in header to bulk-select all top-priority astrobiological targets.
- **Data Export:** Click **"GeoJSON"** or **"CSV"** to download full target inventories.

### Tab 2: Three Forks MSR Cache Depot
- **Context:** Tracks the 10 sealed titanium sample tubes deposited by Perseverance at Three Forks ($18.4541^\circ\text{N}, 77.4113^\circ\text{E}$).
- **Select Tubes:** Select tubes for retrieval (*Malay*, *Ha'ahóni*, *Atsá*, *Amalik*, *Crosswind Lake*, etc.).
- **Payload Mass:** Automatically tracks cumulative return sample core payload mass ($g$).
- **Add Depot to Route:** Click **"Add Depot to Mission Route"** to inject Three Forks depot coordinates into the traverse route.

---

## 7. Module 6: Water Resources & ISRU Chemical Plant (`/resources`)

### Purpose
Mineral volatile database and chemical plant simulator modeling In-Situ Resource Utilization (ISRU).

### Tab 1: Aqueous Mineralogy & Water-Ice Reality
- **Mineral Observations:** CRISM, PIXL, and SHERLOC detections (smectite clays, Fe/Mg carbonates, hydrated silica).
- **Filter by Evidence Class:** Filter by `direct_observation`, `remote_sensing_indication`, or `inference`.
- **Water-Ice Reality Disclosure:** Prominent disclosure clarifying that equatorial Jezero contains no detectable near-surface ice; water is bound within hydrated minerals requiring thermal pyrolysis ($450^\circ\text{C}$).

### Tab 2: ISRU Chemical Synthesizer
- **MOXIE SOXE Oxygen Synthesis:** Adjust electrical power ($0.5–5.0\ \text{kW}$) and duty cycle ($2–24\ \text{h/sol}$) to simulate solid oxide electrolysis of atmospheric $CO_2$ ($2\text{CO}_2 \to 2\text{CO} + \text{O}_2$).
- **Regolith Smectite Thermal Pyrolysis:** Adjust regolith throughput ($50–500\ \text{kg/sol}$) and clay moisture yield ($1.0\%–4.0\%$) to extract $H_2O$ at $450^\circ\text{C}$.
- **Sabatier MAV Propellant:** Synthesizes methane rocket propellant ($\text{CO}_2 + 4\text{H}_2 \to \text{CH}_4 + 2\text{H}_2\text{O}$).
- **Augment Mission Supplies:** Click **"Augment Mission Supplies"** to inject synthesized $O_2$ and $H_2O$ directly into the active mission life-support loadout.

---

## 8. Module 7: Atmospheric & Radiation Telemetry (`/environment`)

### Purpose
Presents calibrated archived in-situ environmental measurements from Mars 2020 Perseverance MEDA and MSL Curiosity RAD.

### Operating Instructions
- **Diurnal Air Temperature:** View air temperature curves across 11 representative sols ($-90^\circ\text{C}$ to $-15^\circ\text{C}$).
- **Atmospheric Pressure:** Inspect seasonal surface barometric cycles (~$700–850\ \text{Pa}$).
- **Curiosity RAD Dosimetry:** Reference Galactic Cosmic Ray (GCR) background dosimetry ($210\ \mu\text{Gy/sol}$).
- **Cumulative Mission Dose:** Displays projected crew ionizing radiation dosage ($m\text{Gy}$) based on planned mission duration.

---

## 9. Module 8: Terrain-Aware Route Planner (`/routes`)

### Purpose
Calculates energy-optimized traverse paths over the 20-meter DTM using an 8-connected grid A* algorithm.

### Operating Instructions
1. **Configure Waypoints:** Reorder waypoints using up/down controls; remove or add waypoints.
2. **Loop & Invert Tools:**
   - Click **"Return to Base (Round-Trip Loop)"** to solve the complete return traverse circuit.
   - Click **"Invert Route"** to reverse traverse direction.
3. **Select Strategy:**
   - *Shortest Distance:* Minimizes Euclidean distance.
   - *Balanced:* Optimizes travel distance against slope climb.
   - *Lowest Risk:* Applies exponential penalties to slopes $>15^\circ$ and boulder fields.
4. **Plan Route:** Click **"Plan Route"**. Review travel distance ($km$), elevation climb ($m$), descent ($m$), and travel duration ($h$).
5. **Profile Chart:** Inspect the elevation profile chart with amber hazard highlights.
6. **GIS Export:** Click **"Export GeoJSON"** or **"Export GPX"** to download 3D trajectory files.

---

## 10. Module 9: Astronaut Survival Simulator (`/survival`)

### Purpose
NASA BVAD 2022 calibrated hourly mass-balance metabolic simulation.

### Operating Instructions
1. **Set Base Loadout:** Configure Crew Size (1–6), Duration (days), initial $O_2$ ($kg$), Water ($kg$), Battery ($kWh$), Scrubber capacity ($kg$), and Food ($kg$). Emergency reserve fraction defaults to $20\%$.
2. **Select Scenario:** Test 7 pre-built contingency scenarios (*Normal EVA*, *Extended Mission*, *Unexpected Delay*, *Dust Storm Incursion*, *Life Support Leak*, *Rover Wheel Slip*, *Extreme Cold Night*).
3. **Author Custom Contingency:** Inject custom delays (+sols), consumption multipliers ($\times 1.0–2.5$), scrubber efficiency loss, and solar power drops.
4. **Inspect Depletion Curves:** Multi-line chart tracks remaining consumable percentages against the $20\%$ red reserve limit.
5. **Export Telemetry:** Click **"Export CSV"** to download sol-by-sol consumable telemetry.

---

## 11. Module 10: Mission Assessment & Monte Carlo Risk (`/assessment`)

### Purpose
Aggregates all mission parameters into a 7-dimension feasibility scorecard and executes stochastic Monte Carlo risk analysis.

### The 7 Assessment Dimensions & Safety Capping Rule
- Evaluates Terrain, Hazards, Consumables, Science, Environment, Return, and Data Reliability.
- **Safety Capping Logic:** If any core life-support consumable or return battery reserve breaches emergency margins, the overall feasibility score is **automatically capped at 45 ("NOT RECOMMENDED")**, regardless of high scientific yield.

### Operating the Monte Carlo Risk Engine
1. Click the **"Monte Carlo Risk Analysis"** tab.
2. Runs 500 stochastic trials introducing Gaussian metabolic variance ($\pm 12\%$), suit seal micro-leak risk ($7\%$), dust storm solar attenuation ($12\%$), and slope-induced rover motor draw surges ($>12^\circ$).
3. Displays **$P(\text{Safe Return})$**, 95% Confidence Interval for depletion sol, and failure mode distribution.
4. Compares results directly against the **NASA Category 1 Human-Rating threshold ($P \ge 99.0\%$)**.

### Generating PDF Mission Flight Plan
- Click **"Download PDF Report"** to compile and download an official ReportLab multi-page mission flight document.

---

## 12. Module 11: Mission Vault (Persistent SQLite Storage)

### Purpose
Database storage for saving, browsing, reloading, and exchanging mission plans.

### Operating Instructions
1. Click **"Vault"** in the top navigation or on the Assessment page.
2. **Save Plan:** Enter a descriptive mission name (e.g. *"Jezero Delta Recon Alpha"*) and click **"Save Current Plan"**.
3. **Browse Saved Plans:** View past expeditions with animated feasibility score rings and verdicts (*RECOMMENDED*, *FEASIBLE*, *HAZARDOUS*).
4. **Load Plan:** Click **"Load"** to restore an archived mission into active workspace memory.
5. **Export / Import JSON:** Click **"Export JSON"** to download a standardized flight plan package; click **"Import JSON"** to load flight plans from ground stations.

---

## 13. Module 12: Scientific Methodology & Citations (`/methodology`)

### Purpose
Documents mathematical proofs, dataset provenance, reliability vocabulary, and academic literature.

### Contents
- **Dataset Registry:** Direct links to official NASA PDS archives for all 10 ingested datasets.
- **Formulas:** Proofs for Horn slope, Riley TRI, A* cost impedance, BVAD mass balances, and Allison-McEwen Mars chronometry.
- **Reliability Vocabulary:** Definitions for `measured`, `processed_observation`, `derived`, `inference`, and `simulation`.
- **Citations:** Full bibliographic references to peer-reviewed literature.

---

## 14. Verification Commands & Automated Test Suite

MARSENSE includes **54 automated tests** passing with zero errors:

```bash
# 1. Run Backend Pytest Suite (21 tests including full lifecycle integration)
PYTHONPATH=backend:tests backend/.venv/bin/pytest backend/tests tests/

# 2. Run Frontend Vitest Unit Tests (17 tests)
npm --prefix frontend run test

# 3. Run Playwright End-to-End Browser Tests (16 tests)
npm --prefix frontend run e2e

# 4. Verify Frontend Production Build (0 errors)
npm --prefix frontend run build
```

---

## 15. Production Deployment Stack (Docker Compose)

MARSENSE is packaged for one-command multi-container deployment:

```bash
# Launch backend (FastAPI), frontend (Nginx reverse proxy), and optional PostGIS
docker-compose up -d

# Check container status
docker-compose ps
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API & Swagger Docs:** `http://localhost:8000/docs`
- **Operations Manual PDF:** `http://localhost:5173/MARSENSE_OPERATIONS_MANUAL.pdf`

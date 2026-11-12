# MARSENSE — Hackathon Demonstration & Presentation Guide
**NASA Space Apps Challenge Submission**  
**Project:** MARSENSE — The Martian Survival Navigator  
**Core Question:** *"Can astronauts safely explore a selected region of Mars, achieve their scientific objectives, manage their life-support resources, and return safely?"*  
**Geographic Focus:** Jezero Crater, Mars (18.38°N, 77.58°E)

---

## 1. Executive Summary & Judging Criteria Alignment

| Judging Criterion | How MARSENSE Addresses It |
|---|---|
| **Impact & Relevance** | Tackles NASA's Artemis-to-Mars transition by combining orbital terrain intelligence with human physiological life-support constraints. Answers feasibility directly. |
| **Scientific Integrity** | Directly processes authentic NASA/USGS rasters (20m CTX DTM, MGS MOLA) and PDS4 in-situ logs (Perseverance MEDA, Curiosity RAD). Explicitly avoids scientific wishful thinking (no false surface ice claims). |
| **Innovation & Modeling** | Integrates terrain slope/roughness impedance directly into A* pathfinding and couples path metrics to NASA BVAD 2022 metabolic mass-balance life-support simulations. |
| **Technical Execution** | Full-stack production architecture: FastAPI scientific backend with rasterio/scipy/scikit-image + React 19 / TypeScript / Vite frontend + CesiumJS 3D Mars globe + ReportLab PDF generation. Over 40 automated tests across unit, integration, and Playwright E2E. |
| **UX & Presentation** | NASA Mission Control aesthetic with real-time telemetry indicators, dynamic interactive charts, terrain cross-sections, and downloadable flight-ready mission reports. |

---

## 2. 15-Step Live Demonstration Script

### Step 1: Open 3D Mars Globe & Mission Telemetry
* **Action:** Navigate to `http://localhost:5173/` (Mission Control), then click **"3D Mars Explorer"** (`/explorer`).
* **Visual:** Dark space environment rendering the Martian sphere with MGS MOLA elevation coloration and IAU Mars 2000 coordinates.
* **Presenter Script:**
  > *"Welcome to MARSENSE — The Martian Survival Navigator. We begin at our orbital view of Mars. Notice our real-time telemetry indicators at the top: backend health, raster pipeline status, and our primary exploration target: Jezero Crater at 18.38°N, 77.58°E."*

### Step 2: Navigate to Jezero Crater
* **Action:** In the Explorer sidebar, click **"Fly to Jezero"** preset button.
* **Visual:** Smooth camera interpolation down to the western rim of Jezero Crater, revealing the ancient river delta fan and crater floor.
* **Presenter Script:**
  > *"With a single click, we descend to Jezero Crater. This 45-kilometer impact crater hosted an open-basin paleolake 3.7 billion years ago, making it prime terrain for astrobiology and human exploration."*

### Step 3: Enable Scientific Map Layers
* **Action:** In the right drawer, select the **Layers** tab. Toggle ON:
  1. *USGS CTX High-Res Orthomosaic (6 m/px)*
  2. *Horn Slope Heatmap*
  3. *Riley Terrain Ruggedness Index (TRI)*
  4. *Perseverance Traverse & Waypoints*
* **Visual:** Orthorectified imagery blends over the globe, highlighting steep scarps in red/orange, smooth crater floor in deep cyan, and the purple ground track of the M20 rover.
* **Presenter Script:**
  > *"We don't rely on synthetic tiles. MARSENSE streams orthorectified USGS CTX mosaic imagery coupled with slope and roughness fields derived in real-time from USGS 20-meter digital terrain models using Horn's finite-difference algorithm."*

### Step 4: Inspect Exploration Locations
* **Action:** Switch to **Inspect** mode. Click on **Octavia E. Butler Landing Site** (18.4446°N, 77.4509°E).
* **Visual:** Inspector card displays: Elevation: -2,572 m, Horn Slope: 1.8° (FLAT), Riley TRI: 0.12 m (SMOOTH), Traversability: 96/100, Engineering Safety: 98/100.
* **Presenter Script:**
  > *"Clicking Octavia E. Butler confirms why NASA selected this site: minimal slope, low rock roughness, and verified DTM coverage. Every coordinate click queries our geospatial engine directly."*

### Step 5: Compare Candidate Landing & Habitat Sites
* **Action:** Click **"Landing Sites"** in navigation (`/landing`).
* **Visual:** Multi-criteria decision matrix comparing Octavia E. Butler, Delta Scarp Base, and Neretva Vallis Rim across 5 engineering factors (slope, roughness, science value, elevation/delta-V, trafficability).
* **Presenter Script:**
  > *"When choosing a human base, trade-offs are inevitable. Notice how Butler maximizes engineering safety with a 92/100 score, while Delta Scarp Base yields a 95 in scientific reach but incurs steeper approach slopes."*

### Step 6: Discover Planetary Science Targets
* **Action:** Click **"Science Targets"** in navigation (`/science`). Type `"Kodiak"` into search, then filter by `"Delta"` unit.
* **Visual:** Kodiak Butte target card appears showing High Priority (5 stars), deltaic stratigraphy, and distance from base. Click **"Add to Mission Objectives"**.
* **Presenter Script:**
  > *"Science is the core purpose of the expedition. We catalog peer-reviewed targets from the Mars 2020 science team. Kodiak Butte represents an isolated delta remnant preserving bottomsets and foresets from the ancient lake."*

### Step 7: Plan an Exploration Route with A* Pathfinding
* **Action:** Click **"Route Planner"** in navigation (`/routes`).
* **Visual:** Start point populated with Octavia E. Butler Base; End point populated with Kodiak Butte. Click **"Plan Route"**.
* **Presenter Script:**
  > *"Here MARSENSE solves the terrain-aware pathfinding problem. Using an 8-connected grid A* algorithm operating on the 20-meter DTM, our cost function penalizes slope exponentially beyond 15 degrees and scales with Riley roughness."*

### Step 8: Identify Hazards & Review Elevation Profile
* **Action:** Toggle between **"Shortest"**, **"Balanced"**, and **"Lowest Risk"** strategies. Examine the Recharts elevation cross-section.
* **Visual:** The profile chart updates dynamically: Shortest distance is 3.4 km with 2 steep slope hazard segments (>15°); Lowest Risk route detours to 4.1 km with 0 severe hazards.
* **Presenter Script:**
  > *"Notice how the 'Lowest Risk' strategy detours around the rugged boulder-strewn scarp. The elevation profile highlights hazard segments in amber. Most crucially, notice the 'DTM Verified' badge — outside the USGS 20m raster, MARSENSE honestly marks routes as unverified rather than fabricating safety."*

### Step 9: Configure Astronaut Life-Support Resources
* **Action:** Click **"Survival Simulator"** in navigation (`/survival`).
* **Visual:** Configuration panel displays: Crew Size: 2 astronauts, EVA Duration: 8 hours, Baseline consumption inputs.
* **Presenter Script:**
  > *"Now we bridge terrain to human survival. Mars is unforgiving. Our simulator is calibrated to NASA's Baseline Values for Exploration Life Support (BVAD 2022): 0.84 kg O2/person/day, 2.5 kg water, 2,800 kcal nutrition, and 450 W life-support power draw."*

### Step 10: Run Baseline Survival Simulation
* **Action:** Select **"Normal EVA Exploration"** scenario and review the depletion curves.
* **Visual:** Multi-line Recharts chart showing linear O2, battery, water, and scrubber depletion over 8 hours. End-of-mission margins: O2 at 64%, Power at 52%, Scrubber at 58% — well above 20% emergency reserve.
* **Presenter Script:**
  > *"Under nominal operations, our two astronauts complete the 8-hour excursion with comfortable safety margins. Scrubber and battery curves remain safely in the green zone."*

### Step 11: Inject an Unexpected Mission Delay
* **Action:** Switch the scenario dropdown to **"Unexpected Mission Delay (+4 hrs)"**.
* **Visual:** Simulation recalculates to a 12-hour mission. Battery drops into the 15% zone. Warning alert appears: `WARNING: Battery capacity approaches critical return threshold.`
* **Presenter Script:**
  > *"What happens when a rover wheel slips in soft sand and delays return by 4 hours? Let's inject a 4-hour delay. Watch the telemetry update instantly."*

### Step 12: Review Resource Depletion Warnings
* **Action:** Switch to **"Dust Storm Incursion"** scenario.
* **Visual:** Red alert banner: `CRITICAL: Power reserve depleted below 20% contingency threshold. Abort EVA recommended.`
* **Presenter Script:**
  > *"During an atmospheric dust storm, solar array output drops by 60% while mobility power increases. MARSENSE detects that battery reserves will breach safety margins at hour 7.1, issuing an immediate abort recommendation."*

### Step 13: Adjust Plan & Loadout Replenishment
* **Action:** Adjust **Battery Capacity** from 18 kWh to 24 kWh and re-run.
* **Visual:** Alert downgrades to green `ALL CONSUMABLES WITHIN SAFE MARGINS`.
* **Presenter Script:**
  > *"By adjusting the EVA payload configuration to carry an auxiliary 6 kWh battery pack before departure, mission control restores safe contingency margins."*

### Step 14: Evaluate Mission Feasibility & Safety Rules
* **Action:** Click **"Assessment"** in navigation (`/assessment`).
* **Visual:** 7-dimension feasibility scorecard:
  - Overall Feasibility: **78 / 100 — FEASIBLE (WITH CAUTION)**
  - Radar breakdown across Terrain, Hazards, Consumables, Science, Environment, Return, and Data Reliability.
* **Presenter Script:**
  > *"The Mission Assessment Engine aggregates all subsystems. Crucially, notice our safety capping logic: if any single life-support or return category drops into the hazard zone, the overall mission score is capped at 45 ('NOT RECOMMENDED'), regardless of high science scores. Mission safety is non-negotiable."*

### Step 15: Generate Flight-Ready PDF Mission Report
* **Action:** Click **"Download PDF Report"**.
* **Visual:** Browser downloads `MARSENSE-Mission-Assessment-Jezero.pdf`. Open the PDF in viewer.
* **Presenter Script:**
  > *"Finally, we generate an official NASA Space Apps Challenge mission report. This multi-page document includes our coordinate bounding box, waypoint coordinates, terrain statistics, life-support mass-balance audit, and scientific citations — generated directly from ReportLab. MARSENSE provides the complete end-to-end toolchain for Martian surface exploration."*

---

## 3. Scientific Disclosures & Integrity Highlights

Judges frequently test whether teams understand real planetary science or are presenting science-fiction assumptions. Highlight these points:

1. **Water-Ice Honesty (No Magic Surface Ice):**
   * *Talking Point:* *"Jezero Crater is equatorial (~18°N). Neither SHARAD orbital radar nor the Mars Odyssey neutron spectrometer detects near-surface water ice. MARSENSE explicitly highlights that hydrated minerals (smectite, carbonates) represent ancient aqueous history, requiring thermal decomposition at 400°C–800°C for ISRU, not shovel-ready ice."*
2. **Radiation Provenance:**
   * *Talking Point:* *"Our radiation baseline comes directly from Curiosity's Radiation Assessment Detector (RAD) at Gale Crater (210 µGy/sol GCR background). We document that this serves as regional reference data rather than live Jezero weather."*
3. **DTM Resolution Limits:**
   * *Talking Point:* *"Our slope and roughness models use real 20-meter USGS CTX DTMs. Rover-scale obstacles (<2 m) cannot be resolved at 20 m/px; therefore, our traversability score includes an explicit sub-pixel uncertainty discount."*

---

## 4. Live Demo Troubleshooting & Contingency

| Scenario | Contingency Action |
|---|---|
| **Cesium WebGL slows down or lags** | Cesium is configured with WebGL fallback; if GPU stutter occurs, use the sidebar 2D map view or navigate directly to `/terrain` and `/routes` where SVG/Canvas/Recharts render immediately. |
| **Backend connection drops** | Check `task-128` (`uvicorn` daemon); restart with `cd backend && PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`. |
| **Browser cache issues** | Hard refresh with `Ctrl+Shift+R` or launch in incognito mode. |

---

## 5. Judge Q&A Cheat Sheet

* **Q: Why Jezero Crater instead of an ice-rich polar region like Utopia Planitia?**  
  * **A:** *"Jezero was selected because it is the most thoroughly characterized site on Mars today due to the Mars 2020 Perseverance rover. We have ground-truth in-situ weather (MEDA), high-resolution orbital DTMs, and verified target coordinates. MARSENSE's architecture is modular and can be loaded with any PDS4 DTM raster."*

* **Q: How does the A* algorithm differ from a simple shortest path?**  
  * **A:** *"A standard shortest path ignores topography. MARSENSE calculates elevation deltas between adjacent 20m pixels. Slopes below 8° incur baseline cost; between 8° and 15° cost rises quadratically; beyond 15° cost increases exponentially as a severe rollover risk. Riley TRI roughness is added as an impedance factor."*

* **Q: What standards were used for astronaut resource consumption?**  
  * **A:** *"NASA's BVAD (Baseline Values and Assumptions Document) 2022 edition for Exploration Life Support, which defines metabolic rates for 70–82 kg crew members performing 350–500 W EVA activity."*

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
| **Technical Execution** | Full-stack production architecture: FastAPI scientific backend with rasterio/scipy/scikit-image + SQLite Mission Vault + React 19 / TypeScript / Vite frontend + CesiumJS 3D Mars globe + ReportLab PDF generation. Over 50 automated tests across unit (Vitest), integration (Pytest), and Playwright E2E. |
| **UX & Presentation** | NASA Mission Control aesthetic with real-time Allison & McEwen Mars chronometry HUD, dynamic interactive charts, terrain cross-sections, Monte Carlo probability distributions, and downloadable flight-ready mission reports. |

---

## 2. 18-Step Live Demonstration Script

### Step 1: Open 3D Mars Globe & Mission Telemetry HUD
* **Action:** Navigate to `http://localhost:5173/` (Mission Control), then inspect the top navigation bar.
* **Visual:** Dark space environment. In the top-right header, notice the live 1-second telemetry HUD:
  `Sol 1324  LTST 14:28:12 (Ls 214° - Perihelion Dust Storm Window)`.
* **Presenter Script:**
  > *"Welcome to MARSENSE — The Martian Survival Navigator. Notice our live Mars Chronometry HUD at the top. We implement NASA GISS Allison & McEwen algorithms computing Mars Sol Date, Coordinated Mars Time, and Local True Solar Time directly for Jezero Crater at 77.58°E. Notice the solar longitude warning: at Ls 214°, Mars is approaching perihelion, triggering our southern spring dust storm alert."*

### Step 2: Navigate to Jezero Crater in 3D Explorer
* **Action:** Click **"3D Mars Explorer"** (`/explorer`), then click **"Fly to Jezero"** in the sidebar.
* **Visual:** Smooth camera interpolation down to the western rim of Jezero Crater, revealing the ancient river delta fan and crater floor on the IAU Mars 2000 ellipsoid.
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

### Step 6: Discover Planetary Science & Three Forks Sample Depot
* **Action:** Click **"Science Targets"** in navigation (`/science`). Click on the **"Three Forks Sample Return Depot"** tab.
* **Visual:** Interactive catalog displaying all 10 authentic Perseverance sample tubes cached at Three Forks. Check the boxes for `Malay` and `Atsá`. Notice the sample mass ticker updating to `108 g`. Click **"Add Depot to Mission Route"**.
* **Presenter Script:**
  > *"In addition to peer-reviewed geological outcrops, MARSENSE tracks the authentic Three Forks Sample Depot dropped by Perseverance. Astronauts can select sample tubes for retrieval, track return payload mass, and inject the Three Forks depot directly into our route planner with one click."*

### Step 7: Plan an Exploration Route with A* Pathfinding
* **Action:** Click **"Route Planner"** in navigation (`/routes`).
* **Visual:** Start point populated with Octavia E. Butler Base; Waypoint 1 populated with Three Forks Depot; End point populated with Kodiak Butte. Click **"Plan Route"**.
* **Presenter Script:**
  > *"Here MARSENSE solves the terrain-aware pathfinding problem. Using an 8-connected grid A* algorithm operating on the 20-meter DTM, our cost function penalizes slope exponentially beyond 15 degrees and scales with Riley roughness."*

### Step 8: Traverse Optimizers & GIS Trajectory Export
* **Action:** Click **"Return to Base (Round-Trip Loop)"**. Next, click **"Export GeoJSON"** and **"Export GPX"**.
* **Visual:** The route closes into a complete round trip back to Octavia E. Butler Base. Standard `.geojson` and `.gpx` files download immediately to the browser.
* **Presenter Script:**
  > *"Real planetary expeditions require round-trip return loops. With one click, MARSENSE solves the return traverse. We also export flight paths directly to standard GIS formats — GeoJSON and GPX — for integration into rover guidance navigation and mission control systems."*

### Step 9: Configure Astronaut Life-Support Resources
* **Action:** Click **"Survival Simulator"** in navigation (`/survival`).
* **Visual:** Configuration panel displays: Crew Size: 2 astronauts, EVA Duration: 8 hours, Baseline consumption inputs.
* **Presenter Script:**
  > *"Now we bridge terrain to human survival. Mars is unforgiving. Our simulator is calibrated to NASA's Baseline Values for Exploration Life Support (BVAD 2022): 0.84 kg O2/person/day, 2.5 kg water, 2,800 kcal nutrition, and 450 W life-support power draw."*

### Step 10: Run Baseline Survival Simulation & Export CSV Telemetry
* **Action:** Select **"Normal EVA Exploration"** scenario and review the depletion curves. Click **"Export CSV"**.
* **Visual:** Multi-line Recharts chart showing linear O2, battery, water, and scrubber depletion over 8 hours. End-of-mission margins: O2 at 64%, Power at 52%, Scrubber at 58%. A CSV file (`MARSENSE_Survival_Telemetry.csv`) downloads with hourly records.
* **Presenter Script:**
  > *"Under nominal operations, our two astronauts complete the excursion with comfortable safety margins. Astronauts and flight controllers can export the exact sol-by-sol consumable telemetry directly to CSV for flight logging."*

### Step 11: Inject Parametric Contingencies & Emergency Alerts
* **Action:** Open **"Author Custom Contingency"**. Set Mission Delay to `+3 Sols` and Scrubber Loss to `15%`. Click **"Apply Custom Contingency"**.
* **Visual:** Telemetry recalculates. Amber alert banner appears: `WARNING: Scrubber capacity breaches 20% emergency margin.`
* **Presenter Script:**
  > *"Beyond pre-programmed scenarios, MARSENSE allows flight directors to inject custom contingency multipliers — simulating unexpected delays, scrubber degradation, or mobility power spikes."*

### Step 12: In-Situ Resource Utilization (ISRU) Chemical Synthesis
* **Action:** Click **"Resources"** in navigation (`/resources`). Switch to the **"ISRU Chemical Plant"** tab.
* **Visual:** Industrial chemical synthesis dashboard modeling MOXIE SOXE (O2 production), Regolith Smectite Thermal Pyrolysis (H2O extraction), and Sabatier MAV Propellant production.
* **Presenter Script:**
  > *"How do we solve consumable depletion? In-Situ Resource Utilization. Here MARSENSE models MOXIE solid oxide electrolysis extracting oxygen from atmospheric CO2 at 800°C, alongside thermal pyrolysis extracting water bound within hydrated smectite clays at 450°C."*

### Step 13: Live Mission Supply Augmentation
* **Action:** Adjust MOXIE power to `2.5 kW` and duty cycle to `16 hrs/sol`. Click **"Augment Mission Supplies"**.
* **Visual:** Green confirmation banner: `Successfully added 4.8 kg O2 and 15.0 kg H2O to mission life-support loadout!`
* **Presenter Script:**
  > *"Notice the closed-loop feedback: clicking 'Augment Mission Supplies' directly injects the synthesized oxygen and water into our active mission state, restoring critical reserves across the entire platform!"*

### Step 14: Evaluate Mission Feasibility & Safety Rules
* **Action:** Click **"Assessment"** in navigation (`/assessment`).
* **Visual:** 7-dimension feasibility scorecard:
  - Overall Feasibility: **82 / 100 — FEASIBLE (WITH CAUTION)**
  - Radar breakdown across Terrain, Hazards, Consumables, Science, Environment, Return, and Data Reliability.
* **Presenter Script:**
  > *"The Mission Assessment Engine aggregates all subsystems. Notice our safety capping logic: if any single life-support or return category drops into the hazard zone, the overall mission score is capped at 45 ('NOT RECOMMENDED'), regardless of high science scores. Mission safety is non-negotiable."*

### Step 15: Stochastic Monte Carlo Risk Analysis
* **Action:** Click on the **"Monte Carlo Risk Analysis"** tab in Assessment.
* **Visual:** 500-trial stochastic risk engine displays:
  - $P(\text{Safe Return})$: **98.4%**
  - Consumable Depletion: **Sol 14.8 [95% CI: 13.6 - 15.9]**
  - Failure Mode Breakdown: Battery Depletion (62%), Scrubber Saturation (25%), Suit Micro-leak (13%).
  - NASA Category 1 Human-Rating Threshold comparison.
* **Presenter Script:**
  > *"Deterministic models can create a false sense of security. MARSENSE runs 500 stochastic Monte Carlo trials, modeling astronaut metabolic variance, suit micro-leak risk, slope-induced power surges, and dust storm solar attenuation. We compute the exact 95% confidence interval for consumable depletion and compare against NASA's Category 1 Human-Rating threshold of 99%."*

### Step 16: Mission Vault (Persistent SQLite Storage & JSON Handover)
* **Action:** Click **"Mission Vault"** at the top. Click **"Save Current Plan"**. Enter `"Jezero Delta Recon Alpha"`.
* **Visual:** Modal shows the newly saved mission with its 82/100 score ring and timestamp. Click **"Export JSON"**.
* **Presenter Script:**
  > *"Expedition plans cannot vanish on page refresh. MARSENSE connects to an SQLite database vault. Flight planners can save active profiles, review archived missions with score rings, and export standardized JSON flight plan packages for ground station sharing."*

### Step 17: Generate Flight-Ready PDF Mission Report
* **Action:** Close Vault and click **"Download PDF Report"**.
* **Visual:** Browser downloads `MARSENSE-Mission-Assessment-Jezero.pdf`. Open the PDF in viewer.
* **Presenter Script:**
  > *"Finally, we generate an official NASA Space Apps Challenge mission report. This multi-page document includes our coordinate bounding box, waypoint coordinates, terrain statistics, life-support mass-balance audit, and scientific citations — generated directly from ReportLab."*

### Step 18: Summary & Final Verdict
* **Presenter Script:**
  > *"MARSENSE directly answers NASA's central question: Can astronauts safely explore Mars, achieve science goals, manage life support, and return safely? With real orbital rasters, terrain-aware pathfinding, BVAD mass-balance survival modeling, ISRU chemical synthesis, and Monte Carlo risk assessment, MARSENSE provides the complete planetary exploration navigator for the Artemis generation."*

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

* **Q: How does the Monte Carlo risk model differ from deterministic simulation?**  
  * **A:** *"A deterministic model computes a single nominal curve with fixed assumptions. Our Monte Carlo engine conducts 500 stochastic trials, drawing metabolic workload from a Gaussian distribution ($\pm 12\%$), suit seal micro-leakage from a Poisson hazard process ($7\%$), regional dust storms attenuating solar panel input ($12\%$), and slope-induced rover motor draw surges ($>12^\circ$). This yields empirical probability distributions, failure mode rankings, and 95% confidence intervals benchmarked against NASA Category 1 Human-Rating criteria."*

* **Q: How does ISRU synthesis connect to mission life-support loadout?**  
  * **A:** *"Rather than treating ISRU as an isolated graphic, MARSENSE models the chemical physics: solid oxide electrolysis of atmospheric $CO_2$ (MOXIE physics at 800°C) producing oxygen, thermal pyrolysis of hydrated smectites at 450°C extracting water, and Sabatier methanation for MAV propellant. When the flight planner clicks 'Augment Mission Supplies', the exact synthesized masses are transferred directly into the active mission state, closing the survival loop."*

* **Q: Why is Three Forks Sample Depot included in human mission planning?**  
  * **A:** *"NASA and ESA's Mars Sample Return architecture established the Three Forks cache as an accessible backup depot where Perseverance dropped 10 sample tubes containing igneous, sedimentary, and regolith cores. For an early human crew, retrieving these sealed tubes provides high-value science without needing deep drilling rigs. MARSENSE tracks tube geology and retrieval payload mass, integrating the depot directly into expedition route planning."*

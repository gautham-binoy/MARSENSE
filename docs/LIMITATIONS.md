# MARSENSE — Limitations, Assumptions & Scientific Integrity Disclosures

**Project:** MARSENSE – The Martian Survival Navigator  
**Context:** NASA International Space Apps Challenge Submission  
**Geographic Domain:** Jezero Crater, Mars (18.38°N, 77.58°E)  

---

## 1. Scientific Integrity Policy

MARSENSE adheres to strict planetary science integrity. We explicitly refuse to fabricate artificial sensor data or present speculative resource deposits as facts. All calculations, visualizations, and assessments are accompanied by explicit reliability tags (`measured`, `processed_observation`, `derived`, `inference`, or `simulation`).

---

## 2. Dataset Limitations & Provenance Disclosures

### 2.1 Water-Ice Absence at Equatorial Jezero
* **Scientific Fact:** Jezero Crater is located at $18.38^\circ\text{N}$ latitude in the Martian tropics.
* **Radar & Neutron Observations:** Neither the Mars Reconnaissance Orbiter (MRO) SHARAD shallow radar sounding instrument nor the Mars Odyssey High Energy Neutron Detector (HEND) shows evidence of near-surface water ice ($<1\ \text{m}$ depth) at Jezero.
* **Implementation in MARSENSE:** The platform explicitly discloses that aqueous minerals (Fe/Mg smectites, magnesium carbonates, hydrated silica) discovered by CRISM, PIXL, and SHERLOC represent ancient aqueous alteration from the Noachian/Hesperian eras (~3.7 Ga). Extracting water requires **thermal decomposition / pyrolysis at $400^\circ\text{C}–800^\circ\text{C}$**, not shovel-ready ice excavation.

### 2.2 Radiation Dosimetry Provenance (Curiosity RAD at Gale Crater)
* **Measurement Source:** In-situ radiation dosimetry is derived from the Mars Science Laboratory (MSL) Curiosity rover's Radiation Assessment Detector (RAD).
* **Spatial Limitation:** Curiosity operates in Gale Crater ($-4.59^\circ\text{S}, 137.44^\circ\text{E}$), located approximately **2,470 km** southeast of Jezero Crater.
* **Atmospheric Column Differences:** Gale Crater has an elevation of ~$-4.4\ \text{km}$, whereas Jezero Crater's floor is at ~$-2.5\ \text{km}$. The slightly thinner atmospheric column above Jezero yields marginally less cosmic ray attenuation. Gale RAD data is presented as **reference regional dosimetry** ($210\ \mu\text{Gy/sol}$ absorbed dose), not live in-situ weather.

### 2.3 Atmospheric Data (Perseverance MEDA Historical Archives)
* **Measurement Source:** Mars Environmental Dynamics Analyzer (MEDA) on the Mars 2020 Perseverance rover.
* **Limitation:** Data represents archived, calibrated PDS4 data products spanning 11 representative sols across different Martian seasons (sols 10, 94, 180, 300, 420, 540, 660, 900, 1020, 1140, 1260). It does not represent a live, real-time forecast.

### 2.4 Topographic Raster Resolution & Sub-Pixel Hazards
* **Primary DTM:** USGS Mars 2020 Context Camera (CTX) Digital Terrain Model at **20 m/pixel** resolution.
* **Regional DEM:** Mars Global Surveyor (MGS) Mars Orbiter Laser Altimeter (MOLA) at **463 m/pixel** resolution.
* **Hazard Resolution Limit:** Rover-scale obstacles (boulders $<2\ \text{m}$, narrow crevices, small sand ripples) cannot be resolved topographically on a 20-meter grid. The Riley Terrain Ruggedness Index (TRI) serves as a proxy for surface roughness, but cannot guarantee 100% obstacle-free terrain. Traversability scores include an explicit sub-pixel uncertainty discount. Outside the 20m CTX raster bounds, routes are clearly flagged as `verified: false`.

---

## 3. Engineering & Modeling Assumptions

### 3.1 Life-Support Mass Balance (NASA BVAD 2022)
* **Metabolic Baseline:** Calculations are calibrated to the NASA Baseline Values and Assumptions Document (BVAD 2022) for Exploration Life Support:
  - Oxygen: $0.84\ \text{kg}/\text{person}/\text{day}$ nominal, scaled by EVA intensity factors ($1.5\times–2.5\times$).
  - Potable & Food Rehydration Water: $2.5\ \text{kg}/\text{person}/\text{day}$.
  - Nutritional Energy: $2,800\ \text{kcal}/\text{person}/\text{day}$.
  - Habitat & Suit Electrical Draw: $450\ \text{W}$ nominal life-support base load.
* **Simplifications:** Consumable degradation assumes linear daily rates unless modified by contingency events (e.g. suit micro-leaks, solar panel dust coverage).

### 3.2 A* Route Pathfinding
* **Grid Topology:** Evaluated on an 8-connected grid with an octile distance heuristic.
* **Slope Impedance:** Slopes below $8^\circ$ incur baseline cost; between $8^\circ$ and $15^\circ$ cost increases quadratically; slopes $>15^\circ$ trigger exponential penalties representing rollover hazard.
* **Rover Mechanical Constraints:** Presumes a 6-wheeled rocker-bogie pressurized rover with a maximum climbing threshold of $20^\circ–25^\circ$.

---

## 4. Software Scope & Future Roadmap

| Capability | Current Status in v1.0 | Future Expansion |
|---|---|---|
| **Primary Region** | Jezero Crater (complete 20m DTM coverage) | Gale Crater, Mawrth Vallis, Valles Marineris (schema supports multiple regions) |
| **HiRISE DTM Integration** | Out of scope (1 m/px DTMs are gigabyte-scale with narrow spatial coverage) | Tile-based streaming of HiRISE 1m DTM strips |
| **Multi-User Real-Time Collaboration** | Mission Vault local SQLite + JSON export/import | Multi-user WebSocket ground-station sync |
| **Certification Status** | Research prototype for NASA Space Apps Challenge | Flight-certified Mission Planning Tool (TRL 6+) |

---

## 5. Non-Certification Disclaimer

> **RESEARCH PROTOTYPE NOTICE:**  
> MARSENSE is an educational and research decision-support tool engineered for the NASA International Space Apps Challenge. It is **NOT** certified by NASA, ESA, or any spaceflight agency as an operational human life-support management or autonomous rover navigation system. Mission decisions for real Martian expeditions must rely on certified mission software and ground-in-the-loop validation.

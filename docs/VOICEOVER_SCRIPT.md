# MARSENSE — The Martian Survival Navigator
## Official Demonstration Voiceover Script

> **NASA Space Apps Challenge 2026**  
> **Topic**: Autonomous Planetary Exploration, Terrain Intelligence & Astronaut ECLSS Life Support  
> **Speaker Role**: Flight Director / Lead Planetary Systems Engineer  
> **Target Delivery**: Professional, authoritative, clear, and measured (approx. 130–145 words per minute).

---

## Quick Reference & Presentation Summary

| Scene | Feature | Key Scientific Focus |
| :---: | :--- | :--- |
| **01** | **Mission Control & Mars Chronometry** | Allison & McEwen algorithms, live Sol/LTST, dust storm season alert, rover telemetry |
| **02** | **Mars Explorer & GIS Layers** | 20 m CTX DTM, CRISM phyllosilicates/carbonates, THEMIS thermal inertia, Horn & Riley inspection |
| **03** | **Terrain Intelligence & Transects** | Traversability Index, Delta Scarp transect cross-section, 15° hazard threshold, CSV export |
| **04** | **Landing Site & Base Selection** | Multi-criteria decision matrix, factor weighting, Octavia E. Butler Base lock |
| **05** | **Planetary Science & MSR Depot** | Mars 2020 science catalogue, Three Forks sample depot (10 authentic sealed sample tubes) |
| **06** | **Water Resources & ISRU Plant** | Polar vs equatorial ice honesty, smectite pyrolysis, MOXIE $O_2$ & Sabatier fuel synthesis |
| **07** | **Atmospheric & Radiation Dosimetry** | Perseverance MEDA diurnal pressure/temp, Curiosity RAD GCR surface dosimetry |
| **08** | **Terrain-Aware Route Planner** | 8-connected A* solver, Safest vs Balanced vs Direct strategies, hazard slopes, GPX/GeoJSON |
| **09** | **Astronaut Survival Simulator** | NASA BVAD 2022 hourly integration, 5 consumables, contingency scenarios, 20% safety margin |
| **10** | **Assessment, Monte Carlo & Vault** | 7-dimension scorecard, 500-run Monte Carlo risk distribution, SQLite vault, 1-click PDF report |

---

## Scene 01: Mission Control Overview & Mars Chronometry

**[CUE & ON-SCREEN ACTION]**  
*The MARSENSE platform opens to the Mission Control dashboard. The cursor moves across the top navigation bar, highlighting the precision Mars Chronometry telemetry (Sol 2038, LTST, $L_s$), hovers over the active Perseverance and Curiosity telemetry cards, and clicks "Fly to Jezero" as the 3D Mars globe swoops seamlessly from planetary orbit down into Jezero Crater.*

**[SPOKEN SCRIPT]**  
> *"Welcome to MARSENSE — The Martian Survival Navigator.  
> 
> When sending human explorers to Mars, mission planners face an uncompromising question: Can astronauts safely explore a selected region of Mars, achieve their scientific objectives, manage their life-support resources, and return safely?  
> 
> We begin in Mission Control. MARSENSE runs a real-time astronomical chronometry engine based on the Allison and McEwen formulations. We compute the exact Mars Sol Date, Coordinated Mars Time, and Local True Solar Time at Jezero Crater. Our orbital dynamics tracker monitors solar longitude ($L_s$), issuing automated alerts when approaching the perihelion dust storm window between $L_s$ 180° and 360°.  
> 
> As we select 'Fly to Jezero', our planetary 3D explorer transitions seamlessly from global orbital vantage down to the crater floor, synchronizing live telemetry from NASA's Perseverance and Curiosity rovers."*

**[KEY DATA HIGHLIGHT]**  
- Allison & McEwen (2000) Mars Chronometry equations.
- Perihelion dust storm hazard window ($L_s = 180^\circ - 360^\circ$).
- Active rover coordinates: Perseverance at Jezero ($18.44^\circ\text{N}, 77.45^\circ\text{E}$), Curiosity at Gale ($4.59^\circ\text{S}, 137.44^\circ\text{E}$).

---

## Scene 02: Mars Explorer & Multi-Spectral GIS Layers

**[CUE & ON-SCREEN ACTION]**  
*The operator navigates to Mars Explorer (`/explorer`). The right panel opens to the Layers tab. The user toggles the 20-meter USGS CTX digital terrain model, then activates the CRISM mineral absorption overlay. The cursor clicks on the crater floor, triggering the Location Inspector with live Horn slope and Riley TRI values, before opening the Bookmarks drawer and selecting the Delta Scarp.*

**[SPOKEN SCRIPT]**  
> *"Navigating into the Mars Explorer, we interface directly with high-resolution NASA and USGS planetary datasets.  
> 
> Here, we can dynamically layer the 20-meter CTX Digital Terrain Model, CRISM mineralogical absorption maps identifying phyllosilicates, carbonates, and olivine, and THEMIS nighttime thermal inertia for regolith grain sizing.  
> 
> By clicking anywhere on the Martian surface, our Location Inspector samples the underlying raster grids in real time. Using Horn's 1981 finite-difference gradient vectors, we derive terrain slope, while Riley's 1999 Terrain Ruggedness Index quantifies micro-topographic hazards.  
> 
> With a single click from our Bookmarks menu, the camera repositions directly over the western Jezero Delta Scarp — an ancient river delta that holds key biosignature targets."*

**[KEY DATA HIGHLIGHT]**  
- 20 m/px CTX DTM resolution (`ctx_dtm_jezero_20m`).
- CRISM NIR spectral bands ($2.3\,\mu\text{m}$ for Fe/Mg smectites, $2.5\,\mu\text{m}$ for carbonates).
- Horn (1981) 8-neighbourhood slope & Riley et al. (1999) TRI.

---

## Scene 03: Terrain Intelligence & Elevation Transects

**[CUE & ON-SCREEN ACTION]**  
*The operator enters Terrain Intelligence (`/terrain`), chooses the 'Delta Scarp' preset, examines the slope frequency histogram and Traversability Index (0.74), and switches to the Elevation Transect tab. The user clicks two endpoints across the scarp face. The interactive cross-section profile renders instantly, highlighting slopes exceeding the 15° rover threshold, followed by a CSV data export.*

**[SPOKEN SCRIPT]**  
> *"Terrain safety dictates rover survival. In the Terrain Intelligence module, MARSENSE computes spatial statistics across user-defined bounding boxes.  
> 
> For the Delta Scarp, our traversability model integrates slope, roughness, and thermal inertia into a normalized Traversability Index of 0.74.  
> 
> To evaluate an ascent path, we deploy the Elevation Transect tool. Clicking across the delta front samples 120 elevation points along the transect line. The profile chart displays real-time elevation changes alongside localized slope gradients. Any segment exceeding the 15-degree critical rollover limit for pressurized rovers is flagged with amber and red hazard warnings. All transect telemetry can be exported instantly to CSV for external geospatial analysis."*

**[KEY DATA HIGHLIGHT]**  
- Critical hazard threshold: $\theta > 15^\circ$ for crewed rover traversability.
- Bilinear interpolation of digital elevation models.
- GeoJSON and CSV data exports.

---

## Scene 04: Landing Site & Habitat Base Selection

**[CUE & ON-SCREEN ACTION]**  
*The operator navigates to Landing Sites (`/landing`), reviewing the multi-criteria candidate matrix comparing Octavia E. Butler Landing, the Delta Front Base, and Belva Crater. The operator adjusts the 'Safety Weight' and 'Science Value' sliders, observing the dynamic radar chart recalculations, then clicks 'Select as Mission Base' to lock Octavia E. Butler Base into the active flight plan.*

**[SPOKEN SCRIPT]**  
> *"Selecting an initial base of operations requires balancing crew safety against scientific payoff.  
> 
> The Landing Site module presents a multi-criteria decision matrix evaluating candidate sites: Octavia E. Butler Landing on the smooth crater floor, the Delta Front base adjacent to ancient mudstones, and the elevated rim of Belva Crater.  
> 
> Planners can tune weighting factors for terrain slope, landing dispersion ellipse, science target proximity, and illumination. As we adjust the safety-versus-science sliders, composite scores update dynamically.  
> 
> We lock 'Octavia E. Butler Landing' as our primary mission base. The coordinates and elevation are instantly committed to our global mission store."*

**[KEY DATA HIGHLIGHT]**  
- Landing site coordinates: $18.4447^\circ\text{N}, 77.4508^\circ\text{E}$, elevation $-2,570\,\text{m}$.
- Multi-criteria decision analysis (MCDA) weighting formula: $S = \sum w_i \cdot s_i$.
- Safe landing slope criterion: $< 8.6^\circ$ within landing ellipse.

---

## Scene 05: Planetary Science Discovery & Three Forks Sample Depot

**[CUE & ON-SCREEN ACTION]**  
*The operator navigates to Science Discovery (`/science`), filters by priority, and selects 4-star+ peer-reviewed targets. The user then switches to the 'Three Forks Sample Depot' tab, showcasing the 10 authentic Perseverance sample tubes. The user selects three sample tubes into the astronaut collection manifest, showing the payload mass and volume updating in real time.*

**[SPOKEN SCRIPT]**  
> *"Science is the primary mission directive. The Science Discovery module houses a curated catalogue of peer-reviewed geological targets identified by NASA's Mars 2020 mission.  
> 
> We filter for priority targets: deltaic mudstones, igneous floor olivines, and carbonate-bearing margin units.  
> 
> Crucially, MARSENSE integrates the Three Forks Mars Sample Return depot. Here are the ten authentic sample tubes dropped by Perseverance on the Martian surface — including sample tube names, rock cores, regolith blanks, and atmospheric samples.  
> 
> Astronauts can designate specific tubes for retrieval. Adding Sample 01 'Malay' and Sample 04 'Mageik' updates our return payload mass and volume constraints automatically."*

**[KEY DATA HIGHLIGHT]**  
- Authentic Perseverance sample tube catalogue: Malay, Amalik, Mageik, Skyland, etc.
- Target classification: Sedimentary delta bottomsets, Noachian basement olivine, regolith controls.
- Payload mass budgeting: $145\,\text{g}$ per titanium sample tube assembly.

---

## Scene 06: Water Resources & ISRU Chemical Synthesis Plant

**[CUE & ON-SCREEN ACTION]**  
*The operator navigates to Water & Resources (`/resources`), highlighting the prominent NASA science reality disclosure regarding the absence of shallow water ice in Jezero. The user scrolls to the Smectite Clay Pyrolysis calculator, then clicks the 'ISRU Chemical Plant' tab, demonstrating live simulations of MOXIE solid oxide electrolysis ($O_2$) and the Sabatier propellant reactor ($CH_4 + O_2$).*

**[SPOKEN SCRIPT]**  
> *"In-situ resource utilization is vital for sustained human presence. However, scientific honesty is paramount: MARSENSE explicitly warns mission planners that Jezero Crater, located at 18 degrees North, contains zero shallow water-ice according to SHARAD radar sounding and neutron spectrometers.  
> 
> Instead, water extraction requires thermal dehydroxylation pyrolysis of hydrated smectite clays, demanding 12 kilowatt-hours of thermal energy per kilogram of water extracted.  
> 
> Switching to our ISRU Chemical Plant, we simulate scalable production based on NASA's MOXIE architecture. Using solid oxide electrolysis, we extract 100% breathable oxygen directly from Mars's 95% carbon dioxide atmosphere. Coupling this with Sabatier catalytic synthesis yields methane and liquid oxygen propellants for our crew's Earth return vehicle."*

**[KEY DATA HIGHLIGHT]**  
- Ground truth disclosure: Jezero is equatorial; no shallow ice (ice stability requires latitude $> 35^\circ-40^\circ$).
- Clay pyrolysis equation: $\text{Smectite} + \Delta H \rightarrow \text{Dehydrated Silicates} + \text{H}_2\text{O}$ at $450^\circ\text{C}-600^\circ\text{C}$.
- MOXIE solid oxide electrolysis: $2\text{CO}_2 \rightarrow 2\text{CO} + \text{O}_2$.
- Sabatier fuel synthesis: $\text{CO}_2 + 4\text{H}_2 \rightarrow \text{CH}_4 + 2\text{H}_2\text{O}$.

---

## Scene 07: Atmospheric Environment & Radiation Dosimetry

**[CUE & ON-SCREEN ACTION]**  
*The operator opens Environment (`/environment`), examining the diurnal Martian weather trends derived from Perseverance MEDA sensors. The cursor moves to the Curiosity RAD radiation panel, showing surface galactic cosmic ray (GCR) dosimetry rates and cumulative career exposure forecasts.*

**[SPOKEN SCRIPT]**  
> *"The Martian environment poses severe environmental hazards. In the Environment module, we visualize continuous atmospheric data captured by Perseverance's MEDA weather station.  
> 
> Planners can analyze diurnal surface pressures oscillating between 720 and 780 Pascals, surface wind vectors, and daily temperature swings from -85 degrees Celsius at night to -15 degrees at solar noon.  
> 
> Radiation exposure is modeled using real surface dosimetry from Curiosity's RAD instrument. With a background galactic cosmic ray dose rate of 0.64 millisieverts per sol, our engine projects cumulative tissue dose for our planned exploration window, guaranteeing compliance with NASA's career effective dose limits."*

**[KEY DATA HIGHLIGHT]**  
- Perseverance MEDA pressure range: $7.2 - 7.8\,\text{hPa}$.
- Diurnal temperature amplitude: $\Delta T \approx 70^\circ\text{C}$ ($-85^\circ\text{C}$ to $-15^\circ\text{C}$).
- MSL RAD surface dose rate: $0.64\,\text{mSv/sol}$ ($234\,\text{mSv/year}$ GCR baseline).

---

## Scene 08: Terrain-Aware Route Planner & A* Solver

**[CUE & ON-SCREEN ACTION]**  
*The operator navigates to Route Planner (`/routes`), clicks 'Solve Route', and watches the 8-connected A* pathfinding algorithm trace an optimal path across the crater floor and up the delta scarp. The operator clicks through 'Safest', 'Balanced', and 'Direct' path strategies, inspects the elevation cross-section, reviews hazard segments, and exports the route to GeoJSON.*

**[SPOKEN SCRIPT]**  
> *"Connecting our base, science targets, and return path requires terrain-aware navigation. In the Route Planner, MARSENSE implements an 8-connected A* search algorithm operating directly on the 20-meter CTX elevation grid.  
> 
> Clicking 'Solve Route' calculates optimal trajectories across three selectable strategies:  
> - 'Safest' strictly minimizes slope and roughness, actively circumnavigating steep escarpments;  
> - 'Direct' minimizes distance traveled;  
> - 'Balanced' optimizes for energy expenditure and time.  
> 
> The elevation profile displays every meter of climb, calculating battery recharge via regenerative braking during downhill descents. The planned route can be exported immediately to GeoJSON or GPX for onboard rover avionics."*

**[KEY DATA HIGHLIGHT]**  
- 8-connected grid A* pathfinding with Euclidean heuristic: $f(n) = g(n) + h(n)$.
- Cost function: $C = d \cdot (1 + k_1 \cdot \text{slope}^2 + k_2 \cdot \text{TRI})$.
- Export formats: GeoJSON feature collection and Garmin/Avionics GPX tracks.

---

## Scene 09: Astronaut Survival Simulator & BVAD Life Support

**[CUE & ON-SCREEN ACTION]**  
*The operator switches to Survival Simulator (`/survival`). The screen displays the hourly mass-balance curves across 5 consumables: $O_2$, potable $H_2O$, calories, $CO_2$ scrubber capacity, and rover battery state of charge. The operator selects the 'Severe Dust Storm' contingency, watching the solar recharge curve drop and reserve margin warnings trigger.*

**[SPOKEN SCRIPT]**  
> *"Astronaut life support is mathematically modeled in the Survival Simulator. Compliant with NASA's Baseline Values and Assumptions Document (BVAD 2022), our engine tracks hourly mass-balance depletion across five vital consumables:  
> Oxygen consumption at 0.84 kilograms per astronaut-day;  
> Potable water at 2.5 liters per day;  
> Metabolic caloric requirements scaled to extravehicular activity workload;  
> Lithium hydroxide and amine CO2 scrubber saturation;  
> And rover battery state-of-charge.  
> 
> We test resilience by injecting contingency scenarios. Simulating a 'Severe Dust Storm' reduces solar array output by 80%. MARSENSE calculates the exact time when battery reserves cross NASA's mandatory 20% emergency safety margin, generating actionable ECLSS abort warnings."*

**[KEY DATA HIGHLIGHT]**  
- NASA BVAD (2022) metabolic baselines: $0.84\,\text{kg } O_2/\text{crew-day}$, $2.5\,\text{kg } H_2O/\text{crew-day}$, $3,000\,\text{kcal/crew-day}$.
- Lithium hydroxide $CO_2$ scrubbing capacity: $1.0\,\text{kg } CO_2$ absorbed per $1.1\,\text{kg LiOH}$.
- Minimum contingency reserve margin: $20\%$ remaining capacity at base return.

---

## Scene 10: Mission Feasibility Assessment, Monte Carlo & Vault

**[CUE & ON-SCREEN ACTION]**  
*The operator enters Mission Assessment (`/assessment`), showing the 7-dimension feasibility scorecard and safety capping rules. The user triggers the 500-run Monte Carlo stochastic simulation, displaying the probability distribution of safe return (96.4%). The user clicks the top bar 'Vault' button to reveal the SQLite Mission Vault modal, and finishes by triggering the 1-click professional PDF report download.*

**[SPOKEN SCRIPT]**  
> *"Finally, the Mission Assessment module synthesizes all operational data into a rigorous 7-dimension feasibility scorecard: terrain traversability, route safety, consumable margins, radiation exposure, thermal extremes, science return, and data integrity.  
> 
> To ensure realistic life safety, MARSENSE enforces strict NASA safety capping rules: if life support reserves drop below 20%, or slope exceeds 20 degrees, the overall mission score is capped regardless of high science points.  
> 
> We execute a 500-run stochastic Monte Carlo simulation, perturbing rover velocity, consumable leaks, and terrain slip. The distribution reveals a 96.4% probability of safe mission return.  
> 
> All mission parameters can be saved, restored, or versioned in the SQLite Mission Vault. With one click, MARSENSE compiles an official, publication-grade NASA PDF mission report complete with telemetry tables, radar plots, and operational sign-off."*

**[KEY DATA HIGHLIGHT]**  
- 7 assessment dimensions: Terrain (20%), Route (20%), Consumables (25%), Radiation (10%), Environment (10%), Science (10%), Data Completeness (5%).
- Hard safety capping rules: If $\text{Margin} < 20\%$, $\text{Score}_{\text{overall}} \le 40$.
- 500-run Monte Carlo uncertainty analysis: $P(\text{Safe Return}) \ge 95\%$ target.
- Official PDF Report generation (`ReportLab` `%PDF-1.4`).

---

## Outro & Operational Sign-off

**[CUE & ON-SCREEN ACTION]**  
*The final screen displays the Mission Feasibility Verified summary card with MARSENSE branding and NASA Space Apps Challenge 2026 credits.*

**[SPOKEN SCRIPT]**  
> *"From planetary orbit to rover tracks, from ancient clays to astronaut life support — MARSENSE transforms complex NASA planetary datasets into actionable survival intelligence.  
> 
> Explore Jezero safely. Empower humanity's next giant leap.  
> 
> Thank you."*

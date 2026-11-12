# MARSENSE Scientific Methodology

This document explains how each analytical feature computes its results, what data it uses, and what its
limits are. The same text is shown (abridged) in the in-app Methodology page. MARSENSE is a research and
education prototype; nothing here is a certified engineering or life-support assessment.

## 0. Reliability classes
Every value in the app carries one of:

| class | meaning | example |
|---|---|---|
| `measured` | Instrument measurement from the archive, unmodified except unit conversion | MEDA pressure, RAD dose rate, rover waypoint |
| `processed_observation` | NASA/USGS product derived from measurements by the data provider | CTX DTM, Trek mosaics, geologic map |
| `derived` | Computed by MARSENSE from a processed observation with a documented algorithm | slope, roughness, route cost |
| `inference` | Scientific interpretation (ours or literature) not directly measured | "delta deposits likely contain clays" |
| `simulation` | Output of a model with user-supplied assumptions | survival timeline |
| `placeholder` | Illustrative only; never used in scoring | none in v1 |

Confidence (0–1) is reported for derived/inference results and is reduced by missing data, low coverage, or coarse resolution.

## 1. Coordinate system and distances
- Planetocentric latitude, east-positive longitude, IAU Mars 2000 sphere (R = 3 396.19 km). All sources used (USGS DTMs, Trek, MMGIS) share this frame.
- Great-circle distance on the sphere (haversine). At Jezero (18.4°N) 1° lon ≈ 56.25 km, 1° lat ≈ 59.27 km.
- Elevations are metres relative to the MOLA areoid (Mars "geoid"). Jezero floor ≈ −2 600 m.

## 2. Terrain intelligence
Inputs: CTX DTM 20 m (primary), HRSC-MOLA 200 m (context/fallback).

- **Slope** (degrees): Horn (1981) 3x3 finite-difference gradient, `atan(sqrt(dz/dx² + dz/dy²))`, with pixel size converted to metres at the DTM's standard parallel. No-data pixels propagate.
- **Roughness**: Terrain Ruggedness Index (Riley et al. 1999) — RMS of elevation differences between a pixel and its 8 neighbours, in metres, at the native 20 m posting. Also reported as residual roughness (std of DEM minus a 5x5 mean) when a region is analysed.
- **Classification** (default thresholds, user-configurable):
  - Rover (Perseverance-class): ≤ 10° benign, 10–20° caution, 20–30° hazardous, > 30° impassable (Mars 2020 traversability guidelines use ~30° as absolute limit; ≤ 15° for routine drives).
  - Astronaut EVA (suited): ≤ 8° benign, 8–15° caution, 15–25° hazardous, > 25° impassable (conservative assumption; no flight-validated standard exists).
  - Roughness (TRI, 20 m posting): < 1 m smooth, 1–3 m moderate, 3–6 m rough, > 6 m very rough.
- **Region assessment**: statistics (mean/p50/p90/max) of slope and roughness over the polygon or bbox, fraction of pixels per class, fraction of no-data, estimated obstacle density (local maxima of TRI above the rough threshold), and a traversability index = share of pixels in benign+caution classes weighted by confidence. Coverage < 95% lowers confidence; coverage < 50% marks the result "insufficient data".
- **Elevation profile**: DTM sampled with bilinear interpolation every ≤ 20 m along the path.
- **Resolution caveat**: a 20 m DTM cannot resolve rocks, small scarps or sand ripples; roughness at this scale is a proxy, not a rock-abundance measurement. HiRISE-scale hazards (≥ 0.5 m rocks) are *not* represented.

## 3. Landing-site intelligence
Multi-criteria weighted score with explicit per-factor sub-scores (0–100) and user-adjustable weights:

| factor | source | scoring |
|---|---|---|
| slope | derived (1 km radius stats) | p90 slope ≤ 5° → 100, linear to 0 at ≥ 20° |
| roughness | derived | TRI p90 ≤ 1 m → 100, 0 at ≥ 6 m |
| elevation | derived | lower is better for EDL (more atmosphere): −2.7 km → 100, −1 km → 40 |
| science proximity | targets catalogue | nearest-target distance ≤ 2 km → 100, 0 at ≥ 15 km; weighted by target priority |
| geological interest | catalogue (inference) | count/priority of distinct unit types within 5 km |
| water/resource evidence | evidence catalogue | best evidence class within 5 km (direct 100 / remote 70 / inference 40 / none 0) |
| data coverage | derived | fraction of valid DTM pixels within radius |

Overall = weighted mean of available factors; **confidence** = mean of factor confidences × coverage.
Factors whose data are missing are listed under "missing information" and do not silently default to a good score; if coverage < 50% the result is "cannot assess". Output is a decision-support estimate, not a NASA-certified site evaluation.

## 4. Water & resource intelligence
Evidence records are categorised: `direct_observation` (in-situ rover instrument), `remote_sensing_indication` (orbital spectra), `inference` (geomorphic/literature), `unknown`.
Hydrated/carbonate minerals indicate *past* water activity. Jezero has **no** documented near-surface ice; the module states this explicitly and never estimates extractable water mass.

## 5. Environmental intelligence
- MEDA (Perseverance, Jezero): per-sol pressure (Pa) and air temperature (K→°C) statistics from the calibrated PDS4 CSVs. Historical; each record shows sol, Earth date (from SCLK when available), instrument, sensor and sample count.
- RAD (Curiosity, Gale): per-sol dose rate (µGy/h) from RDR total-dose fields; converted to µGy/sol for display. Gale is ~2 500 km from Jezero and at −4.5° latitude/−4.4 km elevation; the UI labels it a *reference range*, not a Jezero measurement. No dose-equivalent (Sv) conversion is applied because the quality factor depends on the LET spectrum.
- No real-time weather. The mission simulator uses the MEDA historical range only for context (e.g. night temperatures) — it does not alter resource math.

## 6. Route planning
Grid graph on the 20 m DTM (8-connected). Edge cost = distance × (1 + w_s·f(slope) + w_r·g(roughness)) with f, g piecewise-linear from the class thresholds, and ∞ for impassable/no-data pixels.
Strategies: *shortest* (w_s=w_r≈0, still blocks impassable), *lowest risk* (large weights), *balanced*. A* with octile-distance heuristic (admissible because multipliers ≥ 1).
Outputs: path, length, cumulative climb/descent, elevation profile, slope histogram, hazard segments, estimated drive time (user speed × terrain factors), coverage fraction and `verified` flag (false if any segment leaves the DTM). Routes outside DTM coverage are shown dashed and labelled "unverified terrain".

## 7. Astronaut survival simulation (`simulation`)
Hourly time-step mass-balance model. Default per-person rates (editable, shown in the UI with sources):
- O₂ consumption 0.84 kg/day (NASA BVAD 2022 nominal), EVA factor 1.6× during EVA hours.
- CO₂ production 1.04 kg/day; scrubber capacity in kg CO₂ (regenerable systems modelled as per-day capacity).
- Potable water 2.5 kg/day drinking + hygiene allowance (configurable); recycling efficiency parameter.
- Food 0.62 kg/day dry mass (~2 500 kcal).
- Power: habitat baseline kW + rover kWh/km + EVA suit kWh/h; solar recharge kWh/sol optional, dust factor.
Scenarios apply multipliers/offsets (delay days, consumption surge, scrubber failure, longer return). Warnings fire when a resource crosses reserve threshold or depletes before mission end; "time to depletion" is reported for each resource.
This is an educational model: it ignores leak rates, thermal control, medical contingencies and many other real constraints.

## 8. Mission survival score
Categories, each 0–100 with confidence:
1. **Terrain** (region + route hazard share), 2. **Route accessibility** (verified fraction, impassable segments), 3. **Resources** (min margin across resources, days of reserve), 4. **Environment** (data availability + dust/temperature context; low confidence by design), 5. **Science access** (targets reachable within route/EVA range), 6. **Return feasibility** (return distance vs remaining power/O₂), 7. **Data completeness**.
Overall feasibility = weighted mean, but **capped**: any category < 30 caps overall at 45 ("not recommended"); completeness < 50 caps at 60 and sets verdict "insufficient data". Each category lists the input numbers it used.

## 9. References
- Horn, B.K.P. (1981) Hill shading and the reflectance map. Proc. IEEE 69(1).
- Riley, S.J., DeGloria, S.D., Elliot, R. (1999) A terrain ruggedness index. Intermountain J. Sci. 5.
- Fergason et al. (2020) Mars 2020 TRN flight product generation. LPSC 51, #2020.
- NASA Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570 Rev. 2 (2022).
- Golombek, M. et al. (2012/2020) landing-site engineering constraints (slope ≤ 30°, rock abundance).
- Goudge et al. 2015; Horgan et al. 2020; Stack et al. 2020; Mangold et al. 2021; Farley et al. 2022 (Jezero geology).
- Hassler, D.M. et al. (2014) Mars' surface radiation environment measured with MSL/RAD. Science 343.

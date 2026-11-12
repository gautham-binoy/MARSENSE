# MARSENSE Data Sources

All sources below were verified to be publicly reachable on 2026-11-12 (HTTP 200 / range requests supported).
Every dataset is registered in `backend/app/data/registry.py` with the same identifier used here; the
registry is exposed at `GET /api/datasets` and drives the "Data Sources" panel in the UI.

Reliability vocabulary used throughout the app (see SCIENTIFIC_METHODOLOGY.md):
`measured` · `processed_observation` · `derived` · `inference` · `simulation` · `placeholder`

---

## 1. Terrain (topography)

### `ctx_dtm_jezero_20m` — Mars 2020 TRN CTX DTM Mosaic (USGS Astrogeology)
- **Instrument**: MRO Context Camera (CTX) stereo pairs; controlled to HRSC/MOLA.
- **Source**: https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic
- **File**: `https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` (9.3 MB GeoTIFF, 1596 x 1512 px, float32)
- **Coverage**: 77.1605E–77.699E, 18.211N–18.7212N (western Jezero: landing ellipse, delta, Séítah, Three Forks).
- **Resolution**: 20 m/px. Equirectangular, Mars 2000 sphere (R = 3 396 190 m), planetocentric latitude.
- **Vertical datum**: MOLA areoid ("DeltaGeoid"), metres. Vertical registration 3.8 m RMS between DTMs (USGS report).
- **Acquisition**: CTX images 2006–2019; product published 2020-07-24. DOI 10.5066/P906QQT8.
- **Processing level**: Processed observation (stereo-photogrammetric DTM). All slope/roughness products derived from it are `derived`.
- **Attribution**: USGS Astrogeology Science Center; Fergason et al. (2020) LPSC #2020. Use constraint: "Please cite authors".

### `hrsc_mola_blend_200m` — MGS MOLA / MEX HRSC Blended DEM v2 (USGS)
- **Source**: https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m
- **File**: `https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif` (11.4 GB COG; **only the Jezero window is read via HTTP range requests** — a few hundred kB).
- **Coverage used**: 76.0E–79.0E, 17.0N–20.0N (whole crater plus Neretva/Sava valleys and NE Syrtis margin).
- **Resolution**: 200 m/px. Units metres above areoid. Int16.
- **Acquisition**: MOLA 1997–2001; HRSC 2004–2014. Released 2018 (v2).
- **Attribution**: USGS Astrogeology / Fergason, Hare, Laura (2018).

### `mola_dem_463m` — MGS MOLA Global DEM 463 m (USGS) — fallback only
- **File**: `https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif` (COG, windowed read).
- Used when the HRSC blend is unavailable. Vertical accuracy ~1 m (MOLA), horizontal ~100 m.

---

## 2. Imagery and basemaps (NASA Mars Trek WMTS, all `processed_observation`)

Trek WMTS is RESTful, geographic (EPSG:104905 Mars 2000 sphere), 2x1 tiles at level 0, 256 px tiles.
Template: `https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/default/default028mm/{z}/{row}/{col}.{ext}`

| id | Trek layer | Instrument | Resolution | Coverage | Max zoom |
|---|---|---|---|---|---|
| `viking_mdim21_color` | `Mars_Viking_MDIM21_ClrMosaic_global_232m` | Viking Orbiter VIS | 232 m/px | Global | 7 |
| `mola_color_hillshade` | `Mars_MGS_MOLA_ClrShade_merge_global_463m` | MOLA | 463 m/px | Global | 7 |
| `hrsc_mola_color_shade_200m` | `Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw` | MOLA+HRSC | 200 m/px | Global | 8 |
| `themis_day_ir_100m` | `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` | ODY THEMIS IR (day) | 100 m/px | ±65° lat | 9 |
| `themis_night_ir_100m` | `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` | ODY THEMIS IR (night) | 100 m/px | ±65° lat | 9 |
| `tes_thermal_inertia` | `TES_Thermal_Inertia` | MGS TES | ~7.4 km/px | Global | 1 |
| `usgs_geology_sim3292` | `SIM3292_Global_Geology` | Multi (Tanaka et al. 2014) | 1:20M map | Global | 7 |
| `jezero_ctx_mosaic` | `Jezero_CTX_BlockAdj_dd` | MRO CTX | ~6 m/px | 75.15–78.87E, 15.9–19.45N | 12 |
| `jezero_hirise_mosaic` | `NES_JEZ_MID_Visible_Mosaic_HiRISE_CTX_HRSC_GCS_MARS_07-10-2018` | MRO HiRISE/CTX/HRSC | 25 cm–6 m/px | 76.79–77.73E, 17.58–18.69N | 17 |

Attribution: NASA/JPL-Caltech Mars Trek; USGS Astrogeology; ASU (THEMIS); U. Arizona (HiRISE); MSSS (CTX).
Regional layers are **never** presented as global: each layer's rectangle is enforced in the Cesium provider.

---

## 3. Rover ground truth (`measured`)

### `m20_traverse` / `m20_waypoints` — Perseverance traverse (NASA JPL MMGIS)
- `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json` (GeoJSON LineStrings per drive, CRS84)
- `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json` (points with sol, site/drive, elevation, tilt)
- `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints_current.json` (latest localized position)
- Landing (Octavia E. Butler): 77.4509E, 18.4446N, −2569.9 m. Updated by JPL after each drive; cached locally with the fetch timestamp shown in the UI.

### `msl_waypoints_current` — Curiosity current location (Gale crater, 137.39E, −4.83N). Used only to geolocate RAD/REMS measurements.

---

## 4. Environment (`measured`, historical)

### `m20_meda` — Mars 2020 MEDA (PDS Atmospheres Node)
- Bundle: `https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/`
- Products used: `data_calibrated_env/sol_XXXX_YYYY/sol_NNNN/WE__NNNN___________CAL_PS__________________Pnn.CSV` (pressure, Pa, BAROCAP1..3) and `..._CAL_ATS_..._Pnn.CSV` (air temperature, K, ATS1..5 at ~1.45 m and 0.84 m).
- Ingestion downloads a configurable sample of sols (default ~12 spread over sols 10–1800) and stores per-sol statistics (min/mean/max, n samples). Raw CSVs (~200 kB each) are cached under `data/raw/meda/`.
- **Location**: Perseverance position on that sol (Jezero). **Historical** — not current weather.
- Attribution: NASA/JPL-Caltech/CAB (INTA-CSIC); PDS Atmospheres Node.

### `msl_rad_rdr` — MSL Curiosity RAD RDR (PDS PPI Node, volume MSLRAD_1002)
- Index: `https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_xxxxx_yyyyy/RAD_RDR_<yyyy>_<doy>_<hh>_<mm>_<sol>_V00.TXT` (~18 MB ASCII per sol).
- Fields parsed: `[DOSIMETRY_TOTAL_DOSE_B: NN]` and `[DOSIMETRY_TOTAL_DOSE_E: NN]` — total dose rate in **µGy/h** for the silicon B detector and tissue-equivalent plastic E detector (RAD RDR SIS §4.2.1.6), plus observation start times.
- Ingestion downloads a small sample of sols (default 4) and keeps per-sol mean/min/max dose rate. **Location is Gale crater, ~2 500 km from Jezero**; the UI labels it as a reference measurement from a different site, not a Jezero value.
- Attribution: NASA/JPL/SwRI/Christian-Albrechts-Universität Kiel; PDS PPI Node.

---

## 5. Geology, mineralogy and science targets

### `usgs_geology_sim3292` — Tanaka et al. (2014) Global Geologic Map of Mars (USGS SIM 3292), via Trek WMTS (table above). `processed_observation` (interpretive map).

### `jezero_science_targets` — Curated target catalogue (`inference`, literature-derived)
Stored in `data/metadata/jezero_science_targets.json`. Each feature carries `source` citations. Core references:
- Goudge, T. A. et al. (2015) *JGR Planets* 120 — Jezero delta and mineralogy (Fe/Mg smectite, Mg-carbonate).
- Horgan, B. H. N. et al. (2020) *Icarus* 339 — carbonate "marginal unit" and olivine-carbonate floor.
- Stack, K. M. et al. (2020) *Space Sci. Rev.* 216 — Mars 2020 photogeologic map of the landing site.
- Farley, K. A. et al. (2022) *Science* 377 — Séítah/Máaz igneous floor; Mangold, N. et al. (2021) *Science* 374 — delta/Kodiak stratigraphy.
- NASA/JPL Mars 2020 mission site: named features (Octavia E. Butler landing site, Séítah, Máaz, Three Forks, Kodiak, Hogwallow Flats, Belva crater, Neretva Vallis, Witch Hazel Hill, Bright Angel).
Coordinates are taken from the Mars 2020 traverse data where the rover visited the feature; otherwise from published maps (±200 m).

### `jezero_mineral_evidence` — Orbital/rover mineral detections (`inference` with evidence category)
Stored in `data/metadata/jezero_mineral_evidence.json`. Each record states evidence class
(`remote_sensing_indication` for CRISM detections; `direct_observation` for PIXL/SHERLOC in-situ results),
instrument, reference, and an explicit note that none of these are evidence of present-day extractable water.

### Water-ice
No orbital radar (SHARAD) or neutron (MONS/FREND) product indicates near-surface ice at Jezero (18°N, equatorial).
MARSENSE therefore shows **"No water-ice evidence within region"** for Jezero; this is reported as an *absence of positive evidence*,
not as a measurement of zero ice. The global context is described in the UI (hydrated minerals ≠ ice).

---

## 6. Not used (and why)
- **CRISM MTRDR cubes** (hundreds of MB each): too heavy for the hackathon pipeline; replaced by cited literature detections.
- **HiRISE DTMs** (1 m, ~1–2 GB each): not needed; CTX 20 m suffices for route planning at the crater scale. Could be added to the registry later.
- **SHARAD radargrams**: no documented Jezero subsurface-ice detections.
- **Paid/credentialed APIs**: none required. No API keys are used anywhere.

## Download budget
Full first-run ingestion downloads roughly: CTX DTM 9.3 MB + HRSC window <1 MB + traverse JSON ~2.3 MB + MEDA ~12 sols x 0.4 MB + RAD 4 sols x 18 MB ≈ 90 MB. Everything is cached in `data/raw` and `data/processed` (git-ignored).

# MARSENSE — REST API Specification & Endpoint Documentation

**Project:** MARSENSE – The Martian Survival Navigator  
**Version:** 1.0.0  
**Base URL:** `http://localhost:8000/api`  
**API Specification Standard:** OpenAPI 3.1 / FastAPI  
**Data Standards:** Planetocentric IAU Mars 2000 Sphere ($R = 3,396,190\ \text{m}$), GeoJSON (RFC 7946), NASA PDS4.

---

## 1. Authentication & System Health

### 1.1 Health Check
* **Endpoint:** `GET /api/health`
* **Description:** Returns scientific engine status, loaded DTM raster grids in memory, and primary raster spatial resolution.
* **Response (200 OK):**
```json
{
  "status": "ok",
  "terrain_loaded": [
    "ctx_dtm_jezero_20m",
    "mola_dem_463m"
  ],
  "primary_resolution_m": 20.0
}
```

### 1.2 Regions Registry
* **Endpoint:** `GET /api/regions`
* **Description:** Lists all available planetary regions configured in the database.
* **Response (200 OK):**
```json
[
  {
    "id": "jezero",
    "name": "Jezero Crater",
    "center_lat": 18.38,
    "center_lon": 77.58,
    "west": 77.16,
    "south": 18.21,
    "east": 77.70,
    "north": 18.72,
    "description": "45-km open-basin paleolake crater hosted Mars 2020 Perseverance landing site.",
    "dataset_ids": ["ctx_dtm_jezero_20m", "mola_dem_463m", "m20_traverse", "m20_meda", "msl_rad"]
  }
]
```

### 1.3 Dataset Provenance Registry
* **Endpoint:** `GET /api/datasets`
* **Description:** Retrieves the complete registry of authentic NASA/USGS datasets, cache status, file sizes, and ingest logs.
* **Response (200 OK):**
```json
{
  "datasets": [
    {
      "id": "ctx_dtm_jezero_20m",
      "name": "Jezero Crater 20 m/px CTX DTM",
      "mission": "Mars Reconnaissance Orbiter",
      "instrument": "Context Camera (CTX)",
      "reliability": "derived",
      "resolution": "20 m/px",
      "status": {
        "status": "cached",
        "size_bytes": 10134820,
        "path": "data/raw/JEZ_ctx_B_soc_008_DTM_20m.tif"
      }
    }
  ],
  "fetch_log": []
}
```

### 1.4 Map Layer Catalogue
* **Endpoint:** `GET /api/layers`
* **Description:** Returns the 14 available 2D/3D map layers (Trek WMTS, XYZ backend terrain rasters, GeoJSON vectors).

---

## 2. Dynamic Raster Tile Service

### 2.1 Dynamic Terrain XYZ Tile
* **Endpoint:** `GET /api/tiles/{layer}/{z}/{x}/{y}.png`
* **Path Parameters:**
  - `layer` (`string`, required): One of `elevation`, `slope`, or `roughness`.
  - `z`, `x`, `y` (`integer`, required): Standard Web Mercator / Geographic tile coordinate quadtree.
* **Response (200 OK):** Binary image (`image/png`) rendered with scientific color ramps.

---

## 3. Location Inspection & Terrain Intelligence

### 3.1 Point Location Inspector
* **Endpoint:** `GET /api/locations/inspect`
* **Query Parameters:**
  - `lon` (`float`, required): Planetocentric longitude in degrees East ($0^\circ–360^\circ$).
  - `lat` (`float`, required): Planetocentric latitude in degrees North ($-90^\circ–+90^\circ$).
  - `profile` (`string`, optional): Mobility profile (`rover` or `astronaut`). Default: `rover`.
* **Response (200 OK):**
```json
{
  "lon": 77.4509,
  "lat": 18.4446,
  "terrain": {
    "covered": true,
    "elevation_m": -2572.5,
    "slope_deg": 1.8,
    "roughness_m": 0.12,
    "roughness_resolved": true,
    "terrain_class": "benign",
    "dataset_id": "ctx_dtm_jezero_20m",
    "resolution_m": 20.0,
    "reliability": "derived"
  },
  "nearby_targets": [],
  "nearby_evidence": [],
  "confidence": 0.9,
  "provenance": []
}
```

### 3.2 Regional Bounding Box Terrain Analysis
* **Endpoint:** `POST /api/terrain/analyze`
* **Request Body:**
```json
{
  "west": 77.36,
  "south": 18.40,
  "east": 77.48,
  "north": 18.48,
  "profile": "rover",
  "thresholds": {
    "slope_caution": 8.0,
    "slope_hazard": 15.0,
    "slope_impassable": 25.0
  }
}
```
* **Response (200 OK):**
```json
{
  "covered": true,
  "area_km2": 45.2,
  "n_pixels": 113000,
  "elevation": {
    "min": -2680.0,
    "max": -2450.0,
    "mean": -2560.4,
    "relief": 230.0
  },
  "slope_deg": {
    "mean": 4.2,
    "p50": 2.8,
    "p90": 11.4,
    "max": 28.5
  },
  "roughness_m": {
    "mean": 0.22,
    "p50": 0.15,
    "p90": 0.48,
    "max": 1.82
  },
  "class_fractions": {
    "benign": 0.78,
    "caution": 0.14,
    "hazardous": 0.06,
    "impassable": 0.02
  },
  "traversability_index": 0.86,
  "explanations": [
    "Classification uses slope thresholds 8.0/15.0/25.0° (rover profile).",
    "78% of the area is benign, 14% caution, 6% hazardous, 2% impassable."
  ]
}
```

### 3.3 Elevation Transect Profile
* **Endpoint:** `POST /api/terrain/profile`
* **Request Body:**
```json
{
  "points": [
    {"lon": 77.4509, "lat": 18.4446},
    {"lon": 77.3850, "lat": 18.4350}
  ],
  "step_m": 25
}
```
* **Response (200 OK):**
```json
{
  "samples": [
    {
      "d": 0.0,
      "lon": 77.4509,
      "lat": 18.4446,
      "z": -2572.5,
      "slope": 1.8,
      "src": "ctx_dtm_jezero_20m"
    }
  ],
  "length_m": 3840.5,
  "climb_m": 114.2,
  "descent_m": 8.0,
  "coverage_fraction": 1.0
}
```

---

## 4. Landing Site Multi-Criteria Comparison

### 4.1 Compare Candidate Sites
* **Endpoint:** `POST /api/landing-sites/compare`
* **Request Body:**
```json
{
  "sites": [
    {"name": "Octavia E. Butler", "lon": 77.4509, "lat": 18.4446},
    {"name": "Western Delta Front", "lon": 77.3820, "lat": 18.4280}
  ],
  "radius_m": 1000,
  "weights": {
    "slope": 0.25,
    "roughness": 0.20,
    "elevation": 0.10,
    "science_proximity": 0.15,
    "geological_interest": 0.10,
    "resource_evidence": 0.10,
    "data_coverage": 0.10
  },
  "profile": "rover"
}
```
* **Response (200 OK):**
```json
{
  "ranking": ["Octavia E. Butler", "Western Delta Front"],
  "sites": [
    {
      "name": "Octavia E. Butler",
      "lon": 77.4509,
      "lat": 18.4446,
      "overall_score": 88,
      "verdict": "favourable",
      "factors": {
        "slope": {"score": 94, "value": 1.8, "unit": "°", "confidence": 0.95},
        "roughness": {"score": 92, "value": 0.12, "unit": "m", "confidence": 0.90}
      }
    }
  ]
}
```

---

## 5. Planetary Science & Resource Intelligence

### 5.1 Science Targets Catalogue
* **Endpoint:** `GET /api/science-targets`
* **Description:** Returns GeoJSON FeatureCollection of all curated Jezero targets.

### 5.2 Single Science Target Details
* **Endpoint:** `GET /api/science-targets/{tid}`
* **Description:** Retrieves detailed petrology, instruments, mission context, and local terrain inspect for target `tid`.

### 5.3 Aqueous Mineral Evidence Catalogue
* **Endpoint:** `GET /api/resources/evidence`
* **Description:** Returns GeoJSON FeatureCollection of CRISM, PIXL, and SHERLOC detections.

### 5.4 Water-Ice Reality Statement
* **Endpoint:** `GET /api/resources/water-ice`
* **Description:** Returns official scientific disclosure confirming absence of near-surface water ice at equatorial Jezero.

---

## 6. Environmental Telemetry (MEDA & RAD)

### 6.1 Perseverance MEDA Weather Summary
* **Endpoint:** `GET /api/environment/meda`
* **Description:** Diurnal temperature, surface pressure, and atmospheric dust logs across 11 sampled sols.

### 6.2 Curiosity RAD Dosimetry Summary
* **Endpoint:** `GET /api/environment/rad`
* **Description:** Reference Galactic Cosmic Ray (GCR) absorbed surface dose rates from Gale Crater.

---

## 7. Terrain-Aware Route Planner

### 7.1 Plan Traverse Route
* **Endpoint:** `POST /api/routes/plan`
* **Request Body:**
```json
{
  "points": [
    {"lon": 77.4509, "lat": 18.4446},
    {"lon": 77.4200, "lat": 18.4100}
  ],
  "strategy": "lowest_risk",
  "profile": "rover",
  "speed_kmh": 0.12,
  "alternatives": false
}
```
* **Response (200 OK):**
```json
{
  "strategy": "lowest_risk",
  "length_m": 4210.5,
  "climb_m": 84.0,
  "descent_m": 12.5,
  "max_slope_deg": 11.2,
  "mean_slope_deg": 3.4,
  "hazard_m": 0.0,
  "caution_m": 210.0,
  "hazard_segments": [],
  "estimated_duration_h": 35.1,
  "verified": true,
  "geometry": {
    "type": "LineString",
    "coordinates": [[77.4509, 18.4446], [77.4200, 18.4100]]
  }
}
```

---

## 8. Astronaut Survival Simulator

### 8.1 Run Survival Simulation
* **Endpoint:** `POST /api/survival/simulate`
* **Request Body:**
```json
{
  "supplies": {
    "crew": 2,
    "duration_days": 1,
    "oxygen_kg": 50.0,
    "water_kg": 150.0,
    "battery_kwh": 24.0,
    "co2_scrubber_capacity_kg": 30.0,
    "food_kg": 40.0,
    "emergency_reserve_fraction": 0.20,
    "return_journey_days": 0.25
  },
  "assumptions": {
    "o2_kg_per_day": 0.84,
    "o2_eva_multiplier": 2.5,
    "water_kg_per_day": 2.5,
    "habitat_power_kw": 0.45
  },
  "scenario_ids": ["normal", "delay_4h", "dust_storm"]
}
```
* **Response (200 OK):** Sol-by-sol timeline, resource margin breakdown, warnings, and limiting resource.

---

## 9. Mission Assessment & Vault Persistence

### 9.1 Evaluate Mission Feasibility
* **Endpoint:** `POST /api/missions/assess`
* **Description:** Computes 7-dimension feasibility scorecard, checks safety capping rules, and generates verdict.

### 9.2 List Saved Missions
* **Endpoint:** `GET /api/missions`
* **Response (200 OK):** Array of saved mission summaries from SQLite.

### 9.3 Create / Update / Delete Mission
* **Endpoints:**
  - `POST /api/missions` (Status 201 Created)
  - `GET /api/missions/{mid}` (Status 200 OK)
  - `PUT /api/missions/{mid}` (Status 200 OK)
  - `DELETE /api/missions/{mid}` (Status 204 No Content)

---

## 10. PDF Mission Flight Plan Report

### 10.1 Generate PDF Report
* **Endpoint:** `POST /api/reports/mission`
* **Request Body:**
```json
{
  "mission_name": "Jezero Delta Recon Alpha",
  "plan": {},
  "assessment": {},
  "simulation": {},
  "landing": {}
}
```
* **Response (200 OK):**
  - Content-Type: `application/pdf`
  - Content-Disposition: `attachment; filename="MARSENSE_Jezero_Delta_Recon_Alpha.pdf"`
  - Valid PDF byte stream starting with `%PDF-1.4`.

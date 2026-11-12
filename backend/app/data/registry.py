"""Central dataset registry.

Every dataset MARSENSE uses (remote or local) is described here with provenance metadata.
Download / cache status is resolved at request time by `ingest.dataset_status`.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel


class Reliability(str, Enum):
    measured = "measured"
    processed_observation = "processed_observation"
    derived = "derived"
    inference = "inference"
    simulation = "simulation"
    placeholder = "placeholder"


class Coverage(BaseModel):
    kind: str  # global | regional | point | traverse
    west: float | None = None
    south: float | None = None
    east: float | None = None
    north: float | None = None
    description: str | None = None


class Dataset(BaseModel):
    id: str
    name: str
    mission: str
    instrument: str
    source_url: str
    access_url: str | None = None
    description: str
    coverage: Coverage
    resolution: str
    units: str | None = None
    acquisition: str
    processing_level: str
    reliability: Reliability
    quality_notes: str
    attribution: str
    license: str = "NASA/USGS public domain unless noted; cite the originating team."
    local_file: str | None = None  # relative to data dir, if ingested
    kind: str = "raster"  # raster | tiles | vector | timeseries | catalogue


JEZERO_DTM_BBOX = Coverage(kind="regional", west=77.1604655, south=18.2110274, east=77.6989752, north=18.7211945)
JEZERO_CONTEXT_BBOX = Coverage(kind="regional", west=76.0, south=17.0, east=79.0, north=20.0)

DATASETS: dict[str, Dataset] = {
    d.id: d
    for d in [
        Dataset(
            id="ctx_dtm_jezero_20m",
            name="Mars 2020 TRN CTX DTM Mosaic (Jezero)",
            mission="Mars Reconnaissance Orbiter / Mars 2020",
            instrument="CTX (stereo photogrammetry)",
            source_url="https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic",
            access_url="https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif",
            description="20 m/px digital terrain model built from three CTX stereo pairs, aligned to HRSC/MOLA, produced by USGS for Mars 2020 Terrain Relative Navigation. Primary terrain source for slope, roughness and routing.",
            coverage=JEZERO_DTM_BBOX,
            resolution="20 m/px",
            units="m above MOLA areoid",
            acquisition="CTX images 2006-2019; product 2020-07-24",
            processing_level="Processed observation (DTM); USGS controlled product",
            reliability=Reliability.processed_observation,
            quality_notes="Vertical registration 3.8 m between component DTMs; horizontal ~9.6 m. Cannot resolve features < ~60 m (rocks, ripples).",
            attribution="USGS Astrogeology Science Center; Fergason et al. (2020) LPSC #2020; DOI 10.5066/P906QQT8",
            local_file="raw/JEZ_ctx_B_soc_008_DTM_20m.tif",
        ),
        Dataset(
            id="hrsc_mola_blend_200m",
            name="MOLA/HRSC Blended DEM 200 m (Jezero window)",
            mission="Mars Global Surveyor / Mars Express",
            instrument="MOLA laser altimeter + HRSC stereo",
            source_url="https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m",
            access_url="https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif",
            description="Global 200 m blended DEM. Only a 3x3 degree window around Jezero is read via HTTP range requests (Cloud Optimized GeoTIFF). Provides whole-crater context and fallback where the CTX DTM has no coverage.",
            coverage=JEZERO_CONTEXT_BBOX,
            resolution="200 m/px",
            units="m above MOLA areoid",
            acquisition="MOLA 1997-2001, HRSC 2004-2014; v2 2018",
            processing_level="Processed observation (blended DEM)",
            reliability=Reliability.processed_observation,
            quality_notes="HRSC vertical precision ~10 m; blend seams possible. Coarse: slopes at 200 m underestimate local slopes.",
            attribution="USGS Astrogeology; Fergason, Hare & Laura (2018)",
            local_file="raw/HRSC_MOLA_Blend_200m_jezero.tif",
        ),
        Dataset(
            id="mola_dem_463m",
            name="MOLA Global DEM 463 m (fallback window)",
            mission="Mars Global Surveyor",
            instrument="MOLA",
            source_url="https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m",
            access_url="https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif",
            description="MOLA gridded topography. Used only if the HRSC blend window cannot be fetched.",
            coverage=JEZERO_CONTEXT_BBOX,
            resolution="463 m/px",
            units="m above MOLA areoid",
            acquisition="1997-2001",
            processing_level="Processed observation",
            reliability=Reliability.processed_observation,
            quality_notes="Vertical ~1 m, horizontal ~100 m; sparse at 463 m.",
            attribution="NASA/MGS/MOLA Science Team; USGS",
            local_file="raw/MOLA_463m_jezero.tif",
        ),
        Dataset(
            id="trek_wmts",
            name="NASA Mars Trek WMTS imagery services",
            mission="Multiple (Viking, MGS, Odyssey, MRO)",
            instrument="Viking VIS, MOLA, THEMIS, TES, CTX, HiRISE",
            source_url="https://trek.nasa.gov/mars/",
            access_url="https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/default/default028mm/{z}/{row}/{col}",
            description="Tiled basemaps streamed on demand (no bulk download). Individual layers and their coverage are listed in /api/layers.",
            coverage=Coverage(kind="global", description="Per-layer; regional layers restricted to their rectangles"),
            resolution="232 m (Viking) to 25 cm (HiRISE) per pixel depending on layer",
            acquisition="1976-2019 depending on layer",
            processing_level="Processed observation (controlled mosaics)",
            reliability=Reliability.processed_observation,
            quality_notes="Visual products; not radiometrically calibrated for quantitative analysis.",
            attribution="NASA/JPL-Caltech Mars Trek; USGS; ASU; U. Arizona; MSSS",
            kind="tiles",
        ),
        Dataset(
            id="m20_traverse",
            name="Perseverance traverse and waypoints",
            mission="Mars 2020",
            instrument="Rover localization (visual odometry + orbital tie)",
            source_url="https://mars.nasa.gov/mars2020/mission/where-is-the-rover/",
            access_url="https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json",
            description="Official JPL rover path (per-drive LineStrings) and end-of-drive waypoints with sol, elevation and tilt.",
            coverage=Coverage(kind="traverse", west=77.2, south=18.4, east=77.5, north=18.55),
            resolution="Localized to ~1 m relative to HiRISE basemap",
            units="deg, m",
            acquisition="Sol 13 (2021-03) to latest published sol",
            processing_level="Measured (localization product)",
            reliability=Reliability.measured,
            quality_notes="Position is as published by JPL; may lag by several sols.",
            attribution="NASA/JPL-Caltech MMGIS",
            local_file="raw/M20_traverse.json",
            kind="vector",
        ),
        Dataset(
            id="m20_meda",
            name="Mars 2020 MEDA pressure and air temperature",
            mission="Mars 2020",
            instrument="MEDA PS (Barocap) and ATS",
            source_url="https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/",
            access_url="https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_calibrated_env/",
            description="Calibrated surface pressure (Pa) and air temperature (K) measured at the rover in Jezero crater. A sample of sols is ingested and summarised per sol.",
            coverage=Coverage(kind="point", description="Rover position on each sol (Jezero)"),
            resolution="1 Hz / 0.5 Hz samples; per-sol statistics",
            units="Pa; K (shown as °C)",
            acquisition="2021-02 onward (sampled sols)",
            processing_level="Measured (PDS4 calibrated)",
            reliability=Reliability.measured,
            quality_notes="Historical measurements; not a forecast. Sensor-specific biases documented in the PDS bundle.",
            attribution="NASA/JPL-Caltech/CAB(INTA-CSIC); PDS Atmospheres Node",
            local_file="processed/meda_summary.json",
            kind="timeseries",
        ),
        Dataset(
            id="msl_rad",
            name="MSL Curiosity RAD surface dose rate (Gale crater)",
            mission="Mars Science Laboratory",
            instrument="RAD (Radiation Assessment Detector)",
            source_url="https://pds.nasa.gov/ds-view/pds/viewDataset.jsp?dsid=MSL-M-RAD-3-RDR-V1.0",
            access_url="https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/",
            description="Total dose rate from RAD detectors B (silicon) and E (tissue-equivalent plastic) in µGy/h, parsed from RDR products for a sample of sols.",
            coverage=Coverage(kind="point", west=137.3, south=-4.9, east=137.5, north=-4.5, description="Gale crater, ~2500 km from Jezero"),
            resolution="~32 min observations; per-sol statistics",
            units="µGy/h (µGy/sol derived)",
            acquisition="2012-08 onward (sampled sols)",
            processing_level="Measured (RDR level 1A calibrated)",
            reliability=Reliability.measured,
            quality_notes="Reference values only: different site, elevation and season than Jezero. Absorbed dose, not dose equivalent.",
            attribution="NASA/JPL/SwRI/CAU Kiel; PDS PPI Node; Hassler et al. 2014",
            local_file="processed/rad_summary.json",
            kind="timeseries",
        ),
        Dataset(
            id="jezero_science_targets",
            name="Jezero science target catalogue (curated)",
            mission="Mars 2020 / MRO",
            instrument="Literature synthesis (CRISM, HiRISE, Mars 2020 rover)",
            source_url="https://mars.nasa.gov/mars2020/",
            description="Curated list of documented scientific features (delta, channels, carbonate units, rover sampling locations) with citations.",
            coverage=Coverage(kind="regional", west=77.0, south=18.2, east=77.9, north=18.8),
            resolution="Point/polygon locations ±200 m",
            acquisition="Publications 2015-2024",
            processing_level="Scientific inference (literature)",
            reliability=Reliability.inference,
            quality_notes="Interpretations may be revised by ongoing research; every entry cites its source.",
            attribution="See per-target citations",
            local_file="metadata/jezero_science_targets.json",
            kind="catalogue",
        ),
        Dataset(
            id="jezero_mineral_evidence",
            name="Jezero mineral & water evidence (curated)",
            mission="MRO / Mars 2020",
            instrument="CRISM; PIXL; SHERLOC; SuperCam",
            source_url="https://doi.org/10.1002/2014JE004782",
            description="Documented hydrated/carbonate mineral detections and geomorphic water indicators with evidence class per record.",
            coverage=Coverage(kind="regional", west=77.0, south=18.2, east=77.9, north=18.8),
            resolution="CRISM 18 m/px footprints; rover in-situ points",
            acquisition="Publications 2015-2024",
            processing_level="Remote-sensing indication / direct observation / inference",
            reliability=Reliability.inference,
            quality_notes="Evidence of ancient aqueous alteration. No near-surface water ice has been detected at Jezero.",
            attribution="Goudge et al. 2015; Horgan et al. 2020; Farley et al. 2022; Scheller et al. 2022",
            local_file="metadata/jezero_mineral_evidence.json",
            kind="catalogue",
        ),
        Dataset(
            id="usgs_geology_sim3292",
            name="Global Geologic Map of Mars (SIM 3292)",
            mission="Multiple",
            instrument="Tanaka et al. (2014) mapping",
            source_url="https://pubs.usgs.gov/sim/3292/",
            access_url="https://trek.nasa.gov/tiles/Mars/EQ/SIM3292_Global_Geology/1.0.0/",
            description="1:20M global geologic units (streamed as Trek tiles).",
            coverage=Coverage(kind="global"),
            resolution="1:20,000,000",
            acquisition="Published 2014",
            processing_level="Interpretive map",
            reliability=Reliability.processed_observation,
            quality_notes="Global-scale units; Jezero-scale geology comes from the targets catalogue.",
            attribution="USGS; Tanaka, Skinner, Dohm, Irwin, Kolb, Fortezzo, Platz, Michael, Hare (2014)",
            kind="tiles",
        ),
    ]
}


def get_dataset(dataset_id: str) -> Dataset:
    return DATASETS[dataset_id]

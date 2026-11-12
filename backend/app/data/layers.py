"""Map layer catalogue served to the frontend (/api/layers).

Two layer types:
- `wmts`: streamed from NASA Mars Trek (geographic tiling, 2x1 at level 0).
- `xyz_backend`: rendered by this backend from local rasters (/api/tiles/{layer}/{z}/{x}/{y}.png).
- `vector`: GeoJSON served by this backend.
"""

from __future__ import annotations

from pydantic import BaseModel

TREK = "https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/default/default028mm/{{z}}/{{y}}/{{x}}.{ext}"


class LegendStop(BaseModel):
    value: float | str
    color: str
    label: str | None = None


class Rect(BaseModel):
    west: float
    south: float
    east: float
    north: float


class MapLayer(BaseModel):
    id: str
    name: str
    group: str  # basemap | terrain | imagery | geology | mineralogy | thermal | water | rovers | targets
    type: str  # wmts | xyz_backend | vector
    url: str | None = None
    dataset_id: str
    rectangle: Rect | None = None
    min_zoom: int = 0
    max_zoom: int = 7
    units: str | None = None
    legend: list[LegendStop] | None = None
    legend_type: str | None = None  # gradient | classes | symbols
    description: str
    reliability: str
    source_note: str
    acquisition: str
    resolution: str
    default_opacity: float = 1.0
    is_basemap: bool = False


JEZ_HIRISE = Rect(west=76.7912789, south=17.5791654, east=77.7314417, north=18.6926322)
JEZ_CTX = Rect(west=75.1537692, south=15.9058484, east=78.8717121, north=19.4453003)
JEZ_DTM = Rect(west=77.1604655, south=18.2110274, east=77.6989752, north=18.7211945)
THEMIS = Rect(west=-180, south=-65.0, east=180, north=65.0)

ELEV_LEGEND = [
    LegendStop(value=-2700, color="#1b1e4b", label="-2700 m"),
    LegendStop(value=-2600, color="#2f5b9f", label="-2600 m"),
    LegendStop(value=-2500, color="#3fa7a0", label="-2500 m"),
    LegendStop(value=-2400, color="#8fcf6b", label="-2400 m"),
    LegendStop(value=-2200, color="#e8d86a", label="-2200 m"),
    LegendStop(value=-2000, color="#d9823b", label="-2000 m"),
    LegendStop(value=-1800, color="#a63d2f", label="-1800 m"),
    LegendStop(value=-1500, color="#f4f1ec", label="-1500 m"),
]
SLOPE_LEGEND = [
    LegendStop(value=0, color="#1f7a4d", label="0-5°"),
    LegendStop(value=5, color="#7bc96f", label="5-10°"),
    LegendStop(value=10, color="#e6d84d", label="10-15°"),
    LegendStop(value=15, color="#f0a12b", label="15-20°"),
    LegendStop(value=20, color="#e2571f", label="20-30°"),
    LegendStop(value=30, color="#8c1a1a", label=">30°"),
]
ROUGH_LEGEND = [
    LegendStop(value=0, color="#122a3a", label="<1 m smooth"),
    LegendStop(value=1, color="#2b7a9e", label="1-3 m moderate"),
    LegendStop(value=3, color="#e6d84d", label="3-6 m rough"),
    LegendStop(value=6, color="#e2571f", label="6-10 m very rough"),
    LegendStop(value=10, color="#8c1a1a", label=">10 m"),
]

LAYERS: list[MapLayer] = [
    MapLayer(
        id="viking_mdim21_color", name="Viking MDIM 2.1 color mosaic", group="basemap", type="wmts",
        url=TREK.format(layer="Mars_Viking_MDIM21_ClrMosaic_global_232m", ext="jpg"), dataset_id="trek_wmts",
        max_zoom=7, description="Global Viking Orbiter colour mosaic (232 m/px). Default basemap.",
        reliability="processed_observation", source_note="NASA/USGS via Mars Trek", acquisition="1976-1980",
        resolution="232 m/px", is_basemap=True,
    ),
    MapLayer(
        id="mola_color_hillshade", name="MOLA color hillshade", group="basemap", type="wmts",
        url=TREK.format(layer="Mars_MGS_MOLA_ClrShade_merge_global_463m", ext="jpg"), dataset_id="trek_wmts",
        max_zoom=7, description="Colourised shaded relief from MOLA topography.", reliability="processed_observation",
        source_note="NASA/MGS/MOLA via Mars Trek", acquisition="1997-2001", resolution="463 m/px", is_basemap=True,
    ),
    MapLayer(
        id="hrsc_mola_color_shade_200m", name="MOLA+HRSC color shade 200 m", group="basemap", type="wmts",
        url=TREK.format(layer="Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw", ext="jpg"), dataset_id="trek_wmts",
        max_zoom=8, description="Blended MOLA/HRSC colour shaded relief.", reliability="processed_observation",
        source_note="USGS via Mars Trek", acquisition="1997-2014", resolution="200 m/px", is_basemap=True,
    ),
    MapLayer(
        id="jezero_ctx_mosaic", name="Jezero CTX mosaic (6 m)", group="imagery", type="wmts",
        url=TREK.format(layer="Jezero_CTX_BlockAdj_dd", ext="png"), dataset_id="trek_wmts", rectangle=JEZ_CTX,
        max_zoom=12, description="MRO Context Camera block-adjusted mosaic of the Jezero region.",
        reliability="processed_observation", source_note="NASA/JPL/MSSS via Mars Trek", acquisition="2006-2018",
        resolution="~6 m/px",
    ),
    MapLayer(
        id="jezero_hirise_mosaic", name="Jezero HiRISE/CTX/HRSC mosaic", group="imagery", type="wmts",
        url=TREK.format(layer="NES_JEZ_MID_Visible_Mosaic_HiRISE_CTX_HRSC_GCS_MARS_07-10-2018", ext="png"),
        dataset_id="trek_wmts", rectangle=JEZ_HIRISE, max_zoom=17,
        description="Mars 2020 landing-site orthoimage mosaic (HiRISE 25 cm where available, CTX/HRSC fill).",
        reliability="processed_observation", source_note="JPL ALLSTAR / USGS / UA via Mars Trek", acquisition="2006-2018",
        resolution="0.25-6 m/px",
    ),
    MapLayer(
        id="ctx_dtm_elevation", name="Elevation (CTX DTM 20 m)", group="terrain", type="xyz_backend",
        url="/api/tiles/elevation/{z}/{x}/{y}.png", dataset_id="ctx_dtm_jezero_20m", rectangle=JEZ_DTM,
        min_zoom=6, max_zoom=14, units="m (MOLA areoid)", legend=ELEV_LEGEND, legend_type="gradient",
        description="Colour-mapped elevation rendered from the USGS Mars 2020 CTX DTM.",
        reliability="processed_observation", source_note="USGS CTX DTM, rendered by MARSENSE", acquisition="2006-2019",
        resolution="20 m/px", default_opacity=0.75,
    ),
    MapLayer(
        id="ctx_dtm_slope", name="Slope (derived)", group="terrain", type="xyz_backend",
        url="/api/tiles/slope/{z}/{x}/{y}.png", dataset_id="ctx_dtm_jezero_20m", rectangle=JEZ_DTM,
        min_zoom=6, max_zoom=14, units="degrees", legend=SLOPE_LEGEND, legend_type="classes",
        description="Slope computed with Horn's 3x3 gradient from the CTX DTM.", reliability="derived",
        source_note="Derived by MARSENSE from USGS CTX DTM", acquisition="2006-2019", resolution="20 m/px",
        default_opacity=0.75,
    ),
    MapLayer(
        id="ctx_dtm_roughness", name="Roughness TRI (derived)", group="terrain", type="xyz_backend",
        url="/api/tiles/roughness/{z}/{x}/{y}.png", dataset_id="ctx_dtm_jezero_20m", rectangle=JEZ_DTM,
        min_zoom=6, max_zoom=14, units="m", legend=ROUGH_LEGEND, legend_type="classes",
        description="Terrain Ruggedness Index (Riley 1999) at 20 m posting.", reliability="derived",
        source_note="Derived by MARSENSE from USGS CTX DTM", acquisition="2006-2019", resolution="20 m/px",
        default_opacity=0.75,
    ),
    MapLayer(
        id="usgs_geology_sim3292", name="Global geology (USGS SIM 3292)", group="geology", type="wmts",
        url=TREK.format(layer="SIM3292_Global_Geology", ext="png"), dataset_id="usgs_geology_sim3292", max_zoom=7,
        description="Tanaka et al. 2014 global geologic units. Jezero floor/rim: Noachian highland units (eNh, mNh) and Hesperian-Noachian transition units.",
        reliability="processed_observation", source_note="USGS via Mars Trek", acquisition="2014", resolution="1:20M",
        default_opacity=0.6,
    ),
    MapLayer(
        id="themis_day_ir_100m", name="THEMIS day IR", group="thermal", type="wmts",
        url=TREK.format(layer="THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018", ext="png"), dataset_id="trek_wmts",
        rectangle=THEMIS, max_zoom=9, description="Daytime thermal infrared brightness (emphasises morphology).",
        reliability="processed_observation", source_note="NASA/ASU via Mars Trek", acquisition="2002-2018",
        resolution="100 m/px",
    ),
    MapLayer(
        id="themis_night_ir_100m", name="THEMIS night IR", group="thermal", type="wmts",
        url=TREK.format(layer="THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018", ext="png"), dataset_id="trek_wmts",
        rectangle=THEMIS, max_zoom=9, description="Night-time thermal infrared: bright = high thermal inertia (rock/bedrock), dark = fines/dust.",
        reliability="processed_observation", source_note="NASA/ASU via Mars Trek", acquisition="2002-2018",
        resolution="100 m/px",
    ),
    MapLayer(
        id="tes_thermal_inertia", name="TES thermal inertia", group="thermal", type="wmts",
        url=TREK.format(layer="TES_Thermal_Inertia", ext="png"), dataset_id="trek_wmts", max_zoom=1,
        description="Global thermal inertia (very coarse, ~7 km/px).", reliability="processed_observation",
        source_note="NASA/ASU TES via Mars Trek", acquisition="1997-2006", resolution="~7.4 km/px", default_opacity=0.6,
    ),
    MapLayer(
        id="mineral_evidence", name="Mineral & water evidence (curated)", group="mineralogy", type="vector",
        url="/api/resources/evidence", dataset_id="jezero_mineral_evidence", rectangle=JEZ_CTX,
        description="Documented hydrated/carbonate mineral detections and geomorphic indicators, with evidence class.",
        reliability="inference", source_note="Literature synthesis (CRISM, rover instruments)", acquisition="2015-2024",
        resolution="point/polygon", legend_type="symbols",
        legend=[LegendStop(value="direct_observation", color="#34d399", label="Direct (in-situ)"),
                LegendStop(value="remote_sensing_indication", color="#22d3ee", label="Remote sensing"),
                LegendStop(value="inference", color="#fbbf24", label="Inference"),
                LegendStop(value="unknown", color="#9ca3af", label="Unknown")],
    ),
    MapLayer(
        id="water_ice", name="Water-ice evidence", group="water", type="vector",
        url="/api/resources/water-ice", dataset_id="jezero_mineral_evidence", rectangle=JEZ_CTX,
        description="Near-surface water-ice detections. Jezero (18°N) has none documented; layer reports absence of evidence.",
        reliability="inference", source_note="SHARAD/MONS literature (no Jezero detections)", acquisition="n/a",
        resolution="n/a", legend_type="symbols",
    ),
    MapLayer(
        id="m20_traverse", name="Perseverance traverse", group="rovers", type="vector",
        url="/api/rovers/m20/traverse", dataset_id="m20_traverse",
        rectangle=Rect(west=77.2, south=18.4, east=77.5, north=18.55),
        description="Official rover drive path and current position.", reliability="measured",
        source_note="NASA/JPL MMGIS", acquisition="2021-present", resolution="~1 m",
    ),
    MapLayer(
        id="science_targets", name="Science targets", group="targets", type="vector",
        url="/api/science-targets", dataset_id="jezero_science_targets", rectangle=JEZ_CTX,
        description="Curated scientific exploration targets.", reliability="inference",
        source_note="Literature / Mars 2020 mission", acquisition="2015-2024", resolution="point",
    ),
]

LAYERS_BY_ID = {layer.id: layer for layer in LAYERS}

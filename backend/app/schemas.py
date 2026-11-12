from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class LonLat(BaseModel):
    lon: float = Field(ge=-180, le=360)
    lat: float = Field(ge=-90, le=90)

    @field_validator("lon")
    @classmethod
    def wrap(cls, v: float) -> float:
        return v - 360 if v > 180 else v


class Provenance(BaseModel):
    dataset_id: str
    reliability: str
    method: str | None = None
    resolution_m: float | None = None
    note: str | None = None


class TerrainAnalyzeRequest(BaseModel):
    west: float
    south: float
    east: float
    north: float
    polygon: list[list[float]] | None = None  # [[lon,lat],...]
    profile: str = "rover"
    thresholds: dict[str, float] | None = None


class ProfileRequest(BaseModel):
    points: list[LonLat] = Field(min_length=2)
    step_m: float = 20.0


class SiteCandidate(LonLat):
    name: str | None = None


class LandingCompareRequest(BaseModel):
    sites: list[SiteCandidate] = Field(min_length=1, max_length=8)
    radius_m: float = Field(default=1000.0, ge=200, le=5000)
    weights: dict[str, float] | None = None
    profile: str = "rover"


class RouteRequest(BaseModel):
    points: list[LonLat] = Field(min_length=2, max_length=12)
    strategy: str = "balanced"
    profile: str = "rover"
    max_slope_deg: float | None = Field(default=None, ge=1, le=60)
    max_roughness_m: float | None = Field(default=None, ge=0.1, le=50)
    speed_kmh: float = Field(default=0.12, gt=0, le=20)
    downsample: int = Field(default=1, ge=1, le=8)
    alternatives: bool = False


class SuppliesIn(BaseModel):
    crew: int = Field(default=2, ge=1, le=12)
    duration_days: float = Field(default=10, gt=0, le=1000)
    oxygen_kg: float = Field(default=40, ge=0)
    water_kg: float = Field(default=120, ge=0)
    battery_kwh: float = Field(default=800, ge=0)
    co2_scrubber_capacity_kg: float = Field(default=40, ge=0)
    food_kg: float = Field(default=20, ge=0)
    emergency_reserve_fraction: float = Field(default=0.2, ge=0, le=0.9)
    return_journey_days: float = Field(default=1.0, ge=0, le=100)


class AssumptionsIn(BaseModel):
    o2_kg_per_day: float = 0.84
    o2_eva_multiplier: float = 1.6
    co2_kg_per_day: float = 1.04
    water_kg_per_day: float = 2.5
    hygiene_water_kg_per_day: float = 1.0
    water_recycling_efficiency: float = Field(default=0.0, ge=0, le=0.98)
    food_kg_per_day: float = 0.62
    habitat_power_kw: float = 2.0
    eva_suit_power_kwh_per_h: float = 0.3
    rover_kwh_per_km: float = 1.2
    solar_recharge_kwh_per_sol: float = 0.0
    eva_hours_per_day: float = Field(default=4.0, ge=0, le=16)
    rover_km_per_day: float = Field(default=0.0, ge=0)


class SurvivalRequest(BaseModel):
    supplies: SuppliesIn = SuppliesIn()
    assumptions: AssumptionsIn = AssumptionsIn()
    scenario_ids: list[str] | None = None
    custom_scenario: dict[str, Any] | None = None


class AssessRequest(BaseModel):
    base: LonLat
    targets: list[str] = []
    route: dict[str, Any] | None = None
    supplies: SuppliesIn = SuppliesIn()
    assumptions: AssumptionsIn = AssumptionsIn()
    scenario_id: str = "normal"
    profile: str = "rover"


class MissionIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    region_id: str = "jezero"
    plan: dict[str, Any]
    assessment: dict[str, Any] | None = None


class BookmarkIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    lon: float
    lat: float
    region_id: str | None = "jezero"
    notes: str | None = None
    snapshot: dict[str, Any] | None = None


class ReportRequest(BaseModel):
    mission_name: str = "Untitled mission"
    plan: dict[str, Any]
    assessment: dict[str, Any] | None = None
    simulation: dict[str, Any] | None = None
    landing: dict[str, Any] | None = None

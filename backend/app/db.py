from __future__ import annotations

import json
from collections.abc import Generator
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

from app.config import settings

url = settings.effective_database_url
engine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Region(Base):
    __tablename__ = "regions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str] = mapped_column(Text)
    west: Mapped[float] = mapped_column(Float)
    south: Mapped[float] = mapped_column(Float)
    east: Mapped[float] = mapped_column(Float)
    north: Mapped[float] = mapped_column(Float)
    center_lon: Mapped[float] = mapped_column(Float)
    center_lat: Mapped[float] = mapped_column(Float)
    dataset_ids: Mapped[list] = mapped_column(JSON, default=list)
    geojson: Mapped[str | None] = mapped_column(Text, nullable=True)  # PostGIS geometry would live here in production


class Mission(Base):
    __tablename__ = "missions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128))
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"))
    plan: Mapped[dict] = mapped_column(JSON)  # full client plan: base, targets, route, supplies, assumptions, scenario
    assessment: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    routes: Mapped[list[MissionRoute]] = relationship(back_populates="mission", cascade="all, delete-orphan")
    simulations: Mapped[list[SurvivalSimulation]] = relationship(back_populates="mission", cascade="all, delete-orphan")


class MissionRoute(Base):
    __tablename__ = "mission_routes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mission_id: Mapped[int] = mapped_column(ForeignKey("missions.id"))
    strategy: Mapped[str] = mapped_column(String(32))
    geometry: Mapped[dict] = mapped_column(JSON)
    stats: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    mission: Mapped[Mission] = relationship(back_populates="routes")
    waypoints: Mapped[list[RouteWaypoint]] = relationship(back_populates="route", cascade="all, delete-orphan")


class RouteWaypoint(Base):
    __tablename__ = "route_waypoints"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("mission_routes.id"))
    seq: Mapped[int] = mapped_column(Integer)
    lon: Mapped[float] = mapped_column(Float)
    lat: Mapped[float] = mapped_column(Float)
    label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    route: Mapped[MissionRoute] = relationship(back_populates="waypoints")


class SurvivalSimulation(Base):
    __tablename__ = "survival_simulations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mission_id: Mapped[int] = mapped_column(ForeignKey("missions.id"))
    scenario_id: Mapped[str] = mapped_column(String(32))
    supplies: Mapped[dict] = mapped_column(JSON)
    assumptions: Mapped[dict] = mapped_column(JSON)
    result_summary: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    mission: Mapped[Mission] = relationship(back_populates="simulations")


class BookmarkedLocation(Base):
    __tablename__ = "bookmarks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128))
    lon: Mapped[float] = mapped_column(Float)
    lat: Mapped[float] = mapped_column(Float)
    region_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # inspection result at save time
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


JEZERO = dict(
    id="jezero", name="Jezero Crater", center_lon=77.58, center_lat=18.38, west=76.9, south=17.9, east=78.3, north=18.9,
    description="45 km Noachian impact crater on the NW edge of Isidis basin hosting an ancient open-basin lake and river delta. Landing site of NASA's Perseverance rover (2021).",
    dataset_ids=["ctx_dtm_jezero_20m", "mola_dem_463m", "trek_wmts", "m20_traverse", "m20_meda", "jezero_science_targets", "jezero_mineral_evidence", "usgs_geology_sim3292"],
    geojson=json.dumps({"type": "Polygon", "coordinates": [[[76.9, 17.9], [78.3, 17.9], [78.3, 18.9], [76.9, 18.9], [76.9, 17.9]]]}),
)


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        if s.get(Region, "jezero") is None:
            s.add(Region(**JEZERO))
            s.commit()


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as s:
        yield s

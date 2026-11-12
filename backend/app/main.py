from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import api
from app.config import settings
from app.db import init_db
from app.science import terrain

logging.basicConfig(level=settings.log_level, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("marsense")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    terrain.store.load()
    log.info("MARSENSE backend ready; grids=%s db=%s", [g.dataset_id for g in terrain.store.grids], settings.effective_database_url.split("@")[-1])
    yield


app = FastAPI(
    title="MARSENSE API",
    version="0.1.0",
    description="Martian Survival Navigator - scientific decision-support API (research prototype).",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])
app.include_router(api)


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": f"internal error: {type(exc).__name__}: {exc}"})

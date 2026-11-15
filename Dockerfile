# Multi-Stage Dockerfile for Unified MARSENSE Deployment (Render / Hugging Face / Fly.io / Railway)
# Stage 1: Build the React 19 + Cesium Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python 3.12 Backend with GDAL & Geospatial Libraries
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000 \
    DATA_DIR=/app/data \
    DATABASE_URL=sqlite:////app/data/marsense.db \
    FRONTEND_DIST=/app/frontend/dist

WORKDIR /app

# Install GDAL and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    build-essential \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend packages
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy backend application, data, and metadata
COPY backend/app /app/app
COPY backend/pyproject.toml /app/pyproject.toml
COPY data /app/data

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000

# Start Uvicorn bound to $PORT (handles Render / Cloud dynamic ports)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

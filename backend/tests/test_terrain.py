import numpy as np
import pytest
from app.science import terrain as T

def test_haversine_distance():
    # Distance between points at Jezero crater
    d = T.haversine_m(77.45, 18.44, 77.46, 18.44)
    # 0.01 deg lon at ~18.44N should be ~562.5 m
    assert 550 < d < 580

def test_horn_slope_flat():
    dem = np.full((10, 10), 100.0, dtype=np.float32)
    slope = T.compute_slope_deg(dem, 20.0, 20.0)
    assert np.all(np.isnan(slope) | (slope == 0.0))

def test_horn_slope_incline():
    # 45 degree incline: 20m vertical rise per 20m horizontal run
    x = np.arange(10) * 20.0
    dem = np.tile(x, (10, 1)).astype(np.float32)
    slope = T.compute_slope_deg(dem, 20.0, 20.0)
    # Central pixels should be approximately 45 degrees
    valid_slope = slope[1:-1, 1:-1]
    assert np.allclose(valid_slope, 45.0, atol=1.0)

def test_tri_roughness_flat():
    dem = np.full((10, 10), -2500.0, dtype=np.float32)
    tri = T.compute_tri(dem)
    valid_tri = tri[1:-1, 1:-1]
    assert np.allclose(valid_tri, 0.0)

def test_classification():
    th = T.Thresholds.rover()
    slopes = np.array([3.0, 12.0, 25.0, 35.0])
    roughs = np.array([0.5, 2.0, 5.0, 10.0])
    cls = T.classify(slopes, roughs, th)
    # 0: benign, 1: caution, 2: hazardous, 3: impassable
    assert cls[0] == 0
    assert cls[1] == 1
    assert cls[2] == 2
    assert cls[3] == 3

def test_terrain_store_loaded():
    T.store.load()
    assert len(T.store.grids) >= 1
    primary = T.store.primary
    assert primary is not None
    assert primary.dataset_id == "ctx_dtm_jezero_20m"
    assert primary.resolution_m == 20.0

def test_inspect_point_jezero_center():
    T.store.load()
    th = T.Thresholds.rover()
    res = T.inspect_point(77.45, 18.44, th)
    assert res["covered"] is True
    assert -2650 < res["elevation_m"] < -2500
    assert res["slope_deg"] is not None
    assert res["terrain_class"] in T.CLASS_NAMES

import pytest
import numpy as np
from app.services.localization.homography import (
    HomographyCalibrator,
    wgs84_to_local_metric,
    local_metric_to_wgs84,
    calculate_camera_fov_cone
)

def test_metric_wgs84_roundtrip():
    ref_lat, ref_lon = 12.971598, 77.594566
    target_lat, target_lon = 12.972000, 77.595000

    x_east, y_north = wgs84_to_local_metric(target_lat, target_lon, ref_lat, ref_lon)
    recovered_lat, recovered_lon = local_metric_to_wgs84(x_east, y_north, ref_lat, ref_lon)

    assert recovered_lat == pytest.approx(target_lat, abs=1e-7)
    assert recovered_lon == pytest.approx(target_lon, abs=1e-7)

def test_homography_calibration_4_points():
    calibrator = HomographyCalibrator("CAM-TEST")
    ref_lat, ref_lon = 12.971598, 77.594566
    calibrator.set_reference_origin(ref_lat, ref_lon)

    # 4 corner points
    pts = [
        {"image_x": 100.0, "image_y": 100.0, "geo_lat": ref_lat + 0.0001, "geo_lon": ref_lon - 0.0001},
        {"image_x": 500.0, "image_y": 100.0, "geo_lat": ref_lat + 0.0001, "geo_lon": ref_lon + 0.0001},
        {"image_x": 100.0, "image_y": 400.0, "geo_lat": ref_lat - 0.0001, "geo_lon": ref_lon - 0.0001},
        {"image_x": 500.0, "image_y": 400.0, "geo_lat": ref_lat - 0.0001, "geo_lon": ref_lon + 0.0001},
    ]

    success, msg, rep_err = calibrator.calibrate_from_points(pts)
    assert success is True
    assert calibrator.is_calibrated is True
    assert rep_err is not None
    assert rep_err < 0.5 # Sub-meter reprojection error

    # Test projection of point 1
    geo_coords, tier, acc_m = calibrator.pixel_to_geo(100.0, 100.0)
    assert geo_coords is not None
    assert geo_coords[0] == pytest.approx(pts[0]["geo_lat"], abs=1e-5)
    assert geo_coords[1] == pytest.approx(pts[0]["geo_lon"], abs=1e-5)
    assert tier in ["HIGH", "MEDIUM", "LOW"]

def test_camera_fov_cone():
    cone = calculate_camera_fov_cone(
        lat=12.971598,
        lon=77.594566,
        heading=45.0,
        fov_deg=70.0,
        range_m=100.0
    )
    assert len(cone) > 10
    # First and last point must be the camera origin to form a closed polygon
    assert cone[0] == [12.971598, 77.594566]
    assert cone[-1] == [12.971598, 77.594566]

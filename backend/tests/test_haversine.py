import pytest
import math
from app.services.routing.osrm_service import haversine_distance, format_distance, format_duration

def test_haversine_same_point():
    lat, lon = 12.971598, 77.594566
    dist = haversine_distance(lat, lon, lat, lon)
    assert dist == pytest.approx(0.0, abs=1e-3)

def test_haversine_known_distance():
    # 1 degree of latitude is approximately 111,195 meters
    lat1, lon1 = 12.0, 77.0
    lat2, lon2 = 13.0, 77.0
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    assert 111000.0 < dist < 112000.0

def test_haversine_small_offset():
    # Offset of ~0.001 deg lat is ~111 meters
    lat1, lon1 = 12.971598, 77.594566
    lat2, lon2 = 12.972598, 77.594566
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    assert 105.0 < dist < 115.0

def test_format_distance():
    assert format_distance(74.2) == "74 m"
    assert format_distance(999.4) == "999 m"
    assert format_distance(1250.0) == "1.25 km"

def test_format_duration():
    assert format_duration(45.0) == "45 sec"
    assert format_duration(60.0) == "1 min"
    assert format_duration(95.0) == "1 min 35s"
    assert format_duration(3600.0) == "1 hr 0 min"

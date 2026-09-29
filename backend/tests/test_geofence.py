import pytest
from app.services.geofence.manager import point_in_polygon, GeofenceManager

def test_point_in_polygon():
    # Square polygon centered at (10, 10) with side 2: [9, 11]
    poly = [
        [9.0, 9.0],
        [11.0, 9.0],
        [11.0, 11.0],
        [9.0, 11.0]
    ]

    # Inside
    assert point_in_polygon(10.0, 10.0, poly) is True
    # Outside
    assert point_in_polygon(12.0, 10.0, poly) is False
    assert point_in_polygon(8.0, 8.0, poly) is False

def test_geofence_manager_alerts():
    mgr = GeofenceManager()
    mgr.zones.clear()
    mgr.zone_occupants.clear()

    # Define test zone
    zone_poly = [
        [12.9720, 77.5940],
        [12.9730, 77.5940],
        [12.9730, 77.5950],
        [12.9720, 77.5950]
    ]
    mgr.add_zone("TEST-01", "Restricted Area", "RESTRICTED", zone_poly, alert_on_enter=True)

    # Person outside
    people_outside = [
        {"id": "P001", "geo": {"lat": 12.9710, "lon": 77.5940}}
    ]
    alerts_1 = mgr.check_geofences_and_rules("CAM-001", 1, people_outside)
    assert len(alerts_1) == 0

    # Person enters zone
    people_inside = [
        {"id": "P001", "geo": {"lat": 12.9725, "lon": 77.5945}}
    ]
    alerts_2 = mgr.check_geofences_and_rules("CAM-001", 1, people_inside)
    assert len(alerts_2) == 1
    assert alerts_2[0]["alert_type"] == "GEOFENCE_BREACH"
    assert alerts_2[0]["person_id"] == "P001"

    # Next frame, person still inside: should NOT trigger duplicate enter alert
    alerts_3 = mgr.check_geofences_and_rules("CAM-001", 1, people_inside)
    assert len(alerts_3) == 0

def test_crowd_density_alert():
    mgr = GeofenceManager()
    alerts = mgr.check_geofences_and_rules("CAM-001", people_count=12, people=[], crowd_threshold=10)
    assert len(alerts) >= 1
    crowd_alert = [a for a in alerts if a["alert_type"] == "CROWD_DENSITY"][0]
    assert "12 people detected" in crowd_alert["message"]

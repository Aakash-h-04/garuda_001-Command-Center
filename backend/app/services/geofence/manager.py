import time
from typing import List, Dict, Any, Optional, Set
from app.core.config import settings

def point_in_polygon(lat: float, lon: float, polygon: List[List[float]]) -> bool:
    """
    Ray-casting algorithm for testing if a point (lat, lon) is inside a polygon [[lat, lon], ...]
    """
    if len(polygon) < 3:
        return False

    inside = False
    n = len(polygon)
    p1_lat, p1_lon = polygon[0]

    for i in range(n + 1):
        p2_lat, p2_lon = polygon[i % n]
        if min(p1_lat, p2_lat) < lat <= max(p1_lat, p2_lat):
            if lon <= max(p1_lon, p2_lon):
                if p1_lat != p2_lat:
                    xinters = (lat - p1_lat) * (p2_lon - p1_lon) / (p2_lat - p1_lat) + p1_lon
                if p1_lon == p2_lon or lon <= xinters:
                    inside = not inside
        p1_lat, p1_lon = p2_lat, p2_lon

    return inside

class GeofenceManager:
    def __init__(self):
        self.zones: Dict[str, Dict[str, Any]] = {}
        # Track person presence: {zone_id: set(person_ids)}
        self.zone_occupants: Dict[str, Set[str]] = {}
        self.active_alerts: List[Dict[str, Any]] = []
        self._init_default_demo_zones()

    def _init_default_demo_zones(self):
        """Create sample default zones around the default demo camera location"""
        ref_lat = settings.DEFAULT_CAMERA_LAT
        ref_lon = settings.DEFAULT_CAMERA_LON

        # Restricted Zone (Red) ~40m North-East of camera
        # Roughly 12.9718, 77.5947
        restricted_poly = [
            [ref_lat + 0.00025, ref_lon + 0.00010],
            [ref_lat + 0.00040, ref_lon + 0.00010],
            [ref_lat + 0.00040, ref_lon + 0.00030],
            [ref_lat + 0.00025, ref_lon + 0.00030],
        ]
        self.add_zone(
            zone_id="ZONE-01",
            name="Restricted North Perimeter",
            zone_type="RESTRICTED",
            polygon=restricted_poly,
            color="#ef4444",
            alert_on_enter=True,
            alert_on_exit=False
        )

        # Monitoring Zone (Amber)
        monitoring_poly = [
            [ref_lat + 0.00005, ref_lon - 0.00020],
            [ref_lat + 0.00025, ref_lon - 0.00020],
            [ref_lat + 0.00025, ref_lon + 0.00005],
            [ref_lat + 0.00005, ref_lon + 0.00005],
        ]
        self.add_zone(
            zone_id="ZONE-02",
            name="West Plaza Monitoring Zone",
            zone_type="MONITORING",
            polygon=monitoring_poly,
            color="#f59e0b",
            alert_on_enter=True,
            alert_on_exit=False
        )

    def add_zone(self, zone_id: str, name: str, zone_type: str, polygon: List[List[float]], color: str = "#ef4444", alert_on_enter: bool = True, alert_on_exit: bool = False):
        self.zones[zone_id] = {
            "id": zone_id,
            "name": name,
            "zone_type": zone_type,
            "polygon": polygon,
            "color": color,
            "alert_on_enter": alert_on_enter,
            "alert_on_exit": alert_on_exit
        }
        if zone_id not in self.zone_occupants:
            self.zone_occupants[zone_id] = set()

    def remove_zone(self, zone_id: str):
        if zone_id in self.zones:
            del self.zones[zone_id]
        if zone_id in self.zone_occupants:
            del self.zone_occupants[zone_id]

    def list_zones(self) -> List[Dict[str, Any]]:
        return list(self.zones.values())

    def check_geofences_and_rules(
        self,
        camera_id: str,
        people_count: int,
        people: List[Dict[str, Any]],
        crowd_threshold: int = settings.DEFAULT_CROWD_THRESHOLD
    ) -> List[Dict[str, Any]]:
        """
        Evaluates geofence breaches, crowd density rules, and generates alert events.
        """
        now_str = time.strftime("%H:%M:%S")
        new_alerts = []

        # 1. Crowd Density Alert
        if people_count > crowd_threshold:
            new_alerts.append({
                "camera_id": camera_id,
                "alert_type": "CROWD_DENSITY",
                "severity": "CRITICAL" if people_count >= crowd_threshold * 1.5 else "WARNING",
                "message": f"HIGH CROWD DENSITY: {people_count} people detected (threshold: {crowd_threshold})",
                "person_id": None,
                "zone_id": None,
                "timestamp": now_str
            })

        # 2. Geofence Zone Breaches
        current_frame_occupants: Dict[str, Set[str]] = {zid: set() for zid in self.zones}

        for p in people:
            pid = p.get("id")
            geo = p.get("geo")
            if not geo or not pid:
                continue

            lat = geo.get("lat")
            lon = geo.get("lon")
            if lat is None or lon is None:
                continue

            for zid, zone in self.zones.items():
                is_inside = point_in_polygon(lat, lon, zone["polygon"])
                if is_inside:
                    current_frame_occupants[zid].add(pid)
                    # Check if newly entered
                    if pid not in self.zone_occupants.get(zid, set()):
                        if zone["alert_on_enter"]:
                            sev = "CRITICAL" if zone["zone_type"] == "RESTRICTED" else "WARNING"
                            new_alerts.append({
                                "camera_id": camera_id,
                                "alert_type": "GEOFENCE_BREACH",
                                "severity": sev,
                                "message": f"Person {pid} entered {zone['zone_type']} zone: '{zone['name']}'",
                                "person_id": pid,
                                "zone_id": zid,
                                "timestamp": now_str
                            })

        # Check for zone exits
        for zid, zone in self.zones.items():
            prev = self.zone_occupants.get(zid, set())
            curr = current_frame_occupants.get(zid, set())
            exited = prev - curr
            for pid in exited:
                if zone["alert_on_exit"]:
                    new_alerts.append({
                        "camera_id": camera_id,
                        "alert_type": "GEOFENCE_EXIT",
                        "severity": "INFO",
                        "message": f"Person {pid} exited zone '{zone['name']}'",
                        "person_id": pid,
                        "zone_id": zid,
                        "timestamp": now_str
                    })

        self.zone_occupants = current_frame_occupants
        
        # Keep latest alerts history
        if new_alerts:
            self.active_alerts = (new_alerts + self.active_alerts)[:50]

        return new_alerts

geofence_manager = GeofenceManager()

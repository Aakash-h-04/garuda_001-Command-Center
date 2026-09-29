import math
import time
import httpx
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

EARTH_RADIUS = 6371000.0 # meters

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Exact Haversine formula for spherical distance in meters:
    d = 2R * arcsin(sqrt(sin^2((phi2 - phi1)/2) + cos(phi1)*cos(phi2)*sin^2((lambda2 - lambda1)/2)))
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.asin(math.sqrt(min(1.0, a)))

    return EARTH_RADIUS * c

def format_distance(distance_meters: float) -> str:
    if distance_meters < 1000.0:
        return f"{int(round(distance_meters))} m"
    else:
        return f"{(distance_meters / 1000.0):.2f} km"

def format_duration(seconds: float) -> str:
    secs = int(round(seconds))
    if secs < 60:
        return f"{secs} sec"
    mins = secs // 60
    rem_secs = secs % 60
    if mins < 60:
        return f"{mins} min" if rem_secs == 0 else f"{mins} min {rem_secs}s"
    hours = mins // 60
    rem_mins = mins % 60
    return f"{hours} hr {rem_mins} min"

class RouteCacheEntry:
    def __init__(self, start_lat: float, start_lon: float, end_lat: float, end_lon: float, result: Dict[str, Any]):
        self.start = (start_lat, start_lon)
        self.end = (end_lat, end_lon)
        self.result = result
        self.timestamp = time.time()

class RoutingService:
    def __init__(self):
        self.base_url = settings.OSRM_BASE_URL
        self.cache: Dict[str, RouteCacheEntry] = {} # Keyed by person_id or coords
        self.is_service_online = True
        self.last_status_check = 0.0

    async def get_route(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
        mode: str = "walking", # walking, driving, cycling
        person_id: Optional[str] = None
    ) -> Dict[str, Any]:
        direct_dist = haversine_distance(start_lat, start_lon, end_lat, end_lon)

        # Check Cache
        cache_key = person_id or f"{start_lat:.6f},{start_lon:.6f}->{end_lat:.6f},{end_lon:.6f}:{mode}"
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            # Check movement threshold (3.0 meters) and time validity (< 15 seconds)
            start_drift = haversine_distance(start_lat, start_lon, entry.start[0], entry.start[1])
            end_drift = haversine_distance(end_lat, end_lon, entry.end[0], entry.end[1])
            if start_drift < 3.0 and end_drift < 3.0 and (time.time() - entry.timestamp) < 15.0:
                return entry.result

        # Determine OSRM profile
        # OSRM public service profiles: "foot" (walking), "car" (driving), "bike" (cycling)
        profile_map = {
            "walking": "foot",
            "cycling": "bike",
            "driving": "car"
        }
        osrm_profile = profile_map.get(mode.lower(), "foot")

        # Fallback speeds in m/s: walking ~1.4 m/s (5 km/h), cycling ~4.2 m/s (15 km/h), driving ~11 m/s (40 km/h)
        speed_mps_map = {
            "walking": 1.39,
            "cycling": 4.17,
            "driving": 11.11
        }
        speed_mps = speed_mps_map.get(mode.lower(), 1.39)

        # Attempt call to OSRM
        # URL format: /route/v1/{profile}/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
        url = f"{self.base_url}/route/v1/{osrm_profile}/{start_lon},{start_lat};{end_lon},{end_lat}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true"
        }

        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                response = await client.get(url, params=params)

            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
                    route = data["routes"][0]
                    route_dist = float(route.get("distance", direct_dist))
                    duration_secs = float(route.get("duration", route_dist / speed_mps))
                    # Geometry coordinates in GeoJSON are [lon, lat]
                    geojson_coords = route.get("geometry", {}).get("coordinates", [])
                    # Convert to [lat, lon] for Leaflet
                    lat_lon_coords = [[pt[1], pt[0]] for pt in geojson_coords]

                    self.is_service_online = True
                    result = {
                        "route_distance_meters": round(route_dist, 1),
                        "direct_distance_meters": round(direct_dist, 1),
                        "duration_seconds": round(duration_secs, 1),
                        "formatted_distance": format_distance(route_dist),
                        "formatted_direct_distance": format_distance(direct_dist),
                        "formatted_duration": format_duration(duration_secs),
                        "mode": mode,
                        "coordinates": lat_lon_coords,
                        "is_fallback": False,
                        "provider_note": "Calculated via OSRM road network"
                    }
                    self.cache[cache_key] = RouteCacheEntry(start_lat, start_lon, end_lat, end_lon, result)
                    return result

        except Exception as e:
            logger.warning(f"OSRM routing request failed: {e}. Falling back to direct distance.")
            self.is_service_online = False

        # Fallback when OSRM fails or has no pedestrian route between points:
        # Generate direct or Manhattan intermediate route coordinates with realistic pedestrian detour factor (~1.22x)
        fallback_route_dist = direct_dist * 1.22
        fallback_duration = fallback_route_dist / speed_mps
        
        # Generate 3 intermediate path points to give visual route clarity on map
        mid_lat = (start_lat + end_lat) / 2.0
        mid_lon = (start_lon + end_lon) / 2.0
        coords = [
            [start_lat, start_lon],
            [start_lat, mid_lon],
            [end_lat, mid_lon],
            [end_lat, end_lon]
        ]

        result = {
            "route_distance_meters": round(fallback_route_dist, 1),
            "direct_distance_meters": round(direct_dist, 1),
            "duration_seconds": round(fallback_duration, 1),
            "formatted_distance": format_distance(fallback_route_dist),
            "formatted_direct_distance": format_distance(direct_dist),
            "formatted_duration": format_duration(fallback_duration),
            "mode": mode,
            "coordinates": coords,
            "is_fallback": True,
            "provider_note": "Routing unavailable — showing direct distance approximation"
        }
        self.cache[cache_key] = RouteCacheEntry(start_lat, start_lon, end_lat, end_lon, result)
        return result

routing_service = RoutingService()

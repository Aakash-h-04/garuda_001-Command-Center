from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import datetime

# --- Camera Schemas ---
class CameraBase(BaseModel):
    id: str = Field(..., json_schema_extra={"example": "CAM-001"})
    name: str = Field(..., json_schema_extra={"example": "Sector-Alpha High Gate"})
    provider_type: str = Field("demo", json_schema_extra={"example": "demo"}) # demo, iphone, webcam, rtsp
    stream_url: Optional[str] = None
    latitude: float = Field(12.971598, json_schema_extra={"example": 12.971598})
    longitude: float = Field(77.594566, json_schema_extra={"example": 77.594566})
    altitude: Optional[float] = 15.0
    heading: Optional[float] = 45.0
    fov: Optional[float] = 72.0
    max_range: Optional[float] = 120.0
    mounting_height: Optional[float] = 3.5
    status: str = "ONLINE"
    confidence_threshold: float = 0.50
    is_active: bool = True

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    stream_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    heading: Optional[float] = None
    fov: Optional[float] = None
    max_range: Optional[float] = None
    mounting_height: Optional[float] = None
    status: Optional[str] = None
    confidence_threshold: Optional[float] = None
    is_active: Optional[bool] = None

class CameraOut(CameraBase):
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- Detection & Tracking Schemas ---
class BoundingBox(BaseModel):
    x: float # pixel top-left x
    y: float # pixel top-left y
    width: float
    height: float

class PixelPoint(BaseModel):
    x: float
    y: float

class GeoPoint(BaseModel):
    lat: float
    lon: float

class TrackedPerson(BaseModel):
    id: str = Field(..., json_schema_extra={"example": "P001"})
    confidence: float
    class_name: str = "person"
    bbox: BoundingBox
    ground_pixel: PixelPoint # bottom-center of bounding box
    geo: Optional[GeoPoint] = None
    location_accuracy: str = "UNKNOWN" # HIGH, MEDIUM, LOW, UNKNOWN
    accuracy_meters: Optional[float] = None
    distance_meters: Optional[float] = None # straight-line distance from camera
    route_distance_meters: Optional[float] = None
    estimated_time_seconds: Optional[float] = None
    speed_mps: float = 0.0
    direction: Optional[str] = None # N, NE, E, SE, S, SW, W, NW
    status: str = "Moving" # Stationary, Moving, Lost
    first_seen: str
    last_seen: str
    duration_seconds: float = 0.0

# --- Live WebSocket Payload ---
class SystemMetrics(BaseModel):
    fps: float
    camera_latency_ms: float
    inference_latency_ms: float
    backend_latency_ms: float
    cpu_percent: float
    ram_percent: float

class SystemHealth(BaseModel):
    camera_online: bool = True
    detection_online: bool = True
    gps_available: bool = True
    mapping_online: bool = True
    websocket_connected: bool = True
    routing_online: bool = True

class LiveUpdateMessage(BaseModel):
    type: str = "detection_update"
    timestamp: str
    camera_id: str
    camera: Dict[str, Any]
    people_count: int
    people: List[TrackedPerson]
    metrics: SystemMetrics
    health: SystemHealth
    alerts: List[Dict[str, Any]] = []

# --- Calibration Schemas ---
class CalibrationPointPair(BaseModel):
    image_x: float
    image_y: float
    geo_lat: float
    geo_lon: float

class CalibrationRequest(BaseModel):
    camera_id: str
    points: List[CalibrationPointPair] # At least 4 point correspondences

class CalibrationResponse(BaseModel):
    camera_id: str
    status: str # CALIBRATED, CALIBRATION REQUIRED
    homography_matrix: Optional[List[List[float]]] = None
    reprojection_error: Optional[float] = None
    message: str

# --- Routing Schemas ---
class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    mode: str = "walking" # walking, driving, cycling

class RouteStep(BaseModel):
    instruction: str
    distance_meters: float
    duration_seconds: float

class RouteResponse(BaseModel):
    route_distance_meters: float
    direct_distance_meters: float
    duration_seconds: float
    formatted_duration: str
    mode: str
    coordinates: List[List[float]] # [[lat, lon], ...]
    is_fallback: bool = False # True if OSRM unavailable and straight-line used
    provider_note: Optional[str] = None

# --- Geofence Schemas ---
class GeofenceCreate(BaseModel):
    id: str
    name: str
    zone_type: str = "RESTRICTED" # SAFE, RESTRICTED, MONITORING
    polygon: List[List[float]] # [[lat, lon], [lat, lon], ...]
    color: str = "#ef4444"
    alert_on_enter: bool = True
    alert_on_exit: bool = False

class GeofenceOut(GeofenceCreate):
    created_at: Optional[datetime.datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- Alert Schemas ---
class AlertOut(BaseModel):
    id: int
    camera_id: str
    alert_type: str
    severity: str
    message: str
    person_id: Optional[str] = None
    zone_id: Optional[str] = None
    timestamp: datetime.datetime
    acknowledged: bool = False
    model_config = ConfigDict(from_attributes=True)

# --- Analytics Schemas ---
class TimeSeriesPoint(BaseModel):
    timestamp: str
    people_count: int

class AnalyticsSummary(BaseModel):
    current_people: int
    total_detections_today: int
    peak_people_count: int
    average_people_count: float
    min_people_count: int
    max_people_count: int
    average_confidence: float
    average_tracking_duration_seconds: float
    time_series_1m: List[TimeSeriesPoint]
    time_series_5m: List[TimeSeriesPoint]
    time_series_30m: List[TimeSeriesPoint]
    time_series_1h: List[TimeSeriesPoint]
    time_series_today: List[TimeSeriesPoint]

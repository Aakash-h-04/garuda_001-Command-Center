from app.models.camera import Camera
from app.models.detection import DetectionRecord, PersonTrack, CameraCalibration
from app.models.geofence import GeofenceZone
from app.models.alert import AlertEvent

__all__ = [
    "Camera",
    "DetectionRecord",
    "PersonTrack",
    "CameraCalibration",
    "GeofenceZone",
    "AlertEvent",
]

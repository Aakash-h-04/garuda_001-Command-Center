from fastapi import APIRouter, HTTPException, Depends, Response, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
import cv2
import json

from app.schemas.schemas import (
    CameraBase, CameraCreate, CameraUpdate, CameraOut,
    CalibrationRequest, CalibrationResponse,
    RouteRequest, RouteResponse,
    GeofenceCreate, GeofenceOut,
    AlertOut, AnalyticsSummary
)
from app.services.camera.manager import camera_manager
from app.services.detection.manager import detection_manager
from app.services.routing.osrm_service import routing_service
from app.services.geofence.manager import geofence_manager
from app.services.analytics.manager import analytics_manager
from app.websocket.manager import ws_hub
from app.core.config import settings

api_router = APIRouter()

# --- Cameras Endpoints ---
@api_router.get("/cameras", response_model=List[Dict[str, Any]])
async def list_cameras():
    return camera_manager.list_cameras()

@api_router.get("/cameras/{camera_id}")
async def get_camera(camera_id: str):
    prov = camera_manager.get_provider(camera_id)
    if not prov:
        raise HTTPException(status_code=404, detail="Camera not found")
    stats = prov.get_stats()
    calibrator = ws_hub.get_calibrator(camera_id)
    return {
        "id": camera_id,
        "name": prov.name,
        "status": stats["status"],
        "fps": stats["fps"],
        "latency_ms": stats["latency_ms"],
        "latitude": settings.DEFAULT_CAMERA_LAT,
        "longitude": settings.DEFAULT_CAMERA_LON,
        "altitude": settings.DEFAULT_CAMERA_ALTITUDE,
        "heading": settings.DEFAULT_CAMERA_HEADING,
        "fov": settings.DEFAULT_CAMERA_FOV,
        "range": settings.DEFAULT_CAMERA_RANGE,
        "mounting_height": settings.DEFAULT_MOUNTING_HEIGHT,
        "calibration_status": "CALIBRATED" if calibrator.is_calibrated else "CALIBRATION REQUIRED",
        "reprojection_error": calibrator.reprojection_error
    }

@api_router.put("/cameras/{camera_id}")
async def update_camera(camera_id: str, payload: CameraUpdate):
    if payload.provider_type:
        await camera_manager.set_camera_provider(
            camera_id=camera_id,
            provider_type=payload.provider_type,
            stream_url=payload.stream_url,
            name=payload.name
        )
    if payload.latitude is not None:
        settings.DEFAULT_CAMERA_LAT = payload.latitude
    if payload.longitude is not None:
        settings.DEFAULT_CAMERA_LON = payload.longitude
    if payload.heading is not None:
        settings.DEFAULT_CAMERA_HEADING = payload.heading
    if payload.fov is not None:
        settings.DEFAULT_CAMERA_FOV = payload.fov
    if payload.mounting_height is not None:
        settings.DEFAULT_MOUNTING_HEIGHT = payload.mounting_height
    if payload.confidence_threshold is not None:
        settings.DEFAULT_CONFIDENCE_THRESHOLD = payload.confidence_threshold

    # Update origin in calibrator
    calibrator = ws_hub.get_calibrator(camera_id)
    calibrator.set_reference_origin(settings.DEFAULT_CAMERA_LAT, settings.DEFAULT_CAMERA_LON)

    return {"status": "success", "message": f"Camera {camera_id} settings updated"}

@api_router.get("/cameras/{camera_id}/status")
async def get_camera_status(camera_id: str):
    prov = camera_manager.get_provider(camera_id)
    if not prov:
        raise HTTPException(status_code=404, detail="Camera not found")
    return prov.get_stats()

@api_router.get("/cameras/{camera_id}/stream")
async def get_camera_stream(camera_id: str):
    prov = camera_manager.get_provider(camera_id)
    if not prov:
        raise HTTPException(status_code=404, detail="Camera not found")
    return StreamingResponse(
        camera_manager.generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@api_router.get("/cameras/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: str):
    prov = camera_manager.get_provider(camera_id)
    if not prov:
        raise HTTPException(status_code=404, detail="Camera not found")
    jpeg = prov.get_jpeg_bytes()
    if not jpeg:
        raise HTTPException(status_code=503, detail="Camera frame not ready")
    return Response(content=jpeg, media_type="image/jpeg")

# --- Calibration Endpoints ---
@api_router.get("/calibration/{camera_id}")
async def get_calibration(camera_id: str):
    calibrator = ws_hub.get_calibrator(camera_id)
    h_matrix = calibrator.homography_matrix.tolist() if calibrator.homography_matrix is not None else None
    return {
        "camera_id": camera_id,
        "is_calibrated": calibrator.is_calibrated,
        "status": "CALIBRATED" if calibrator.is_calibrated else "CALIBRATION REQUIRED",
        "reprojection_error": calibrator.reprojection_error,
        "points": calibrator.point_pairs,
        "homography_matrix": h_matrix
    }

@api_router.post("/calibration", response_model=CalibrationResponse)
async def perform_calibration(payload: CalibrationRequest):
    calibrator = ws_hub.get_calibrator(payload.camera_id)
    points_dict = [p.dict() for p in payload.points]
    success, msg, rep_err = calibrator.calibrate_from_points(points_dict)
    
    if not success:
        return CalibrationResponse(
            camera_id=payload.camera_id,
            status="CALIBRATION REQUIRED",
            homography_matrix=None,
            reprojection_error=None,
            message=msg
        )
    
    h_matrix = calibrator.homography_matrix.tolist() if calibrator.homography_matrix is not None else None
    return CalibrationResponse(
        camera_id=payload.camera_id,
        status="CALIBRATED",
        homography_matrix=h_matrix,
        reprojection_error=rep_err,
        message=msg
    )

# --- Routing Endpoints ---
@api_router.post("/routes", response_model=RouteResponse)
async def calculate_route(payload: RouteRequest):
    result = await routing_service.get_route(
        start_lat=payload.start_lat,
        start_lon=payload.start_lon,
        end_lat=payload.end_lat,
        end_lon=payload.end_lon,
        mode=payload.mode
    )
    return RouteResponse(
        route_distance_meters=result["route_distance_meters"],
        direct_distance_meters=result["direct_distance_meters"],
        duration_seconds=result["duration_seconds"],
        formatted_duration=result["formatted_duration"],
        mode=result["mode"],
        coordinates=result["coordinates"],
        is_fallback=result["is_fallback"],
        provider_note=result.get("provider_note")
    )

# --- Geofences Endpoints ---
@api_router.get("/geofences")
async def list_geofences():
    return geofence_manager.list_zones()

@api_router.post("/geofences")
async def create_geofence(payload: GeofenceCreate):
    geofence_manager.add_zone(
        zone_id=payload.id,
        name=payload.name,
        zone_type=payload.zone_type,
        polygon=payload.polygon,
        color=payload.color,
        alert_on_enter=payload.alert_on_enter,
        alert_on_exit=payload.alert_on_exit
    )
    return {"status": "success", "zone": payload.dict()}

@api_router.delete("/geofences/{zone_id}")
async def delete_geofence(zone_id: str):
    geofence_manager.remove_zone(zone_id)
    return {"status": "success", "message": f"Zone {zone_id} deleted"}

# --- Alerts Endpoints ---
@api_router.get("/alerts")
async def list_alerts():
    return geofence_manager.active_alerts

# --- Analytics Endpoints ---
@api_router.get("/analytics")
async def get_analytics():
    tracker = ws_hub.get_tracker(camera_manager.active_camera_id)
    active_count = len([t for t in tracker.tracks if t.time_since_update <= 3])
    return analytics_manager.get_summary(current_people=active_count)

# --- Platform Settings ---
@api_router.get("/settings")
async def get_platform_settings():
    return {
        "roboflow_configured": bool(settings.ROBOFLOW_API_KEY),
        "roboflow_model": settings.ROBOFLOW_MODEL,
        "active_detection_provider": detection_manager.active_provider_name,
        "detection_fps": settings.DETECTION_FPS,
        "confidence_threshold": settings.DEFAULT_CONFIDENCE_THRESHOLD,
        "iou_threshold": settings.DEFAULT_IOU_THRESHOLD,
        "crowd_threshold": settings.DEFAULT_CROWD_THRESHOLD,
        "camera_id": camera_manager.active_camera_id,
        "camera_lat": settings.DEFAULT_CAMERA_LAT,
        "camera_lon": settings.DEFAULT_CAMERA_LON,
        "camera_heading": settings.DEFAULT_CAMERA_HEADING,
        "camera_fov": settings.DEFAULT_CAMERA_FOV,
        "routing_provider": settings.ROUTING_PROVIDER,
        "demo_mode": camera_manager.active_camera_id == "CAM-001" and detection_manager.active_provider_name == "simulated"
    }

@api_router.post("/settings")
async def update_platform_settings(payload: Dict[str, Any]):
    if "roboflow_api_key" in payload:
        key = payload["roboflow_api_key"]
        settings.ROBOFLOW_API_KEY = key
        detection_manager.set_provider("roboflow", api_key=key, model_id=payload.get("roboflow_model", settings.ROBOFLOW_MODEL))
    if "detection_provider" in payload:
        detection_manager.set_provider(payload["detection_provider"])
    if "confidence_threshold" in payload:
        settings.DEFAULT_CONFIDENCE_THRESHOLD = float(payload["confidence_threshold"])
    if "crowd_threshold" in payload:
        settings.DEFAULT_CROWD_THRESHOLD = int(payload["crowd_threshold"])
    if "detection_fps" in payload:
        settings.DETECTION_FPS = int(payload["detection_fps"])
        ws_hub.detection_interval = 1.0 / max(1, settings.DETECTION_FPS)

    return {"status": "success", "message": "Settings updated"}

@api_router.get("/health")
async def health_check():
    prov = camera_manager.get_provider(camera_manager.active_camera_id)
    return {
        "status": "healthy",
        "camera": prov.status if prov else "OFFLINE",
        "detection": detection_manager.get_status(),
        "websocket_clients": len(ws_hub.active_connections)
    }

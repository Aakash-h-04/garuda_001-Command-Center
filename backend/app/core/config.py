from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Geospatial Human Tracking Platform"
    API_V1_STR: str = "/api"
    
    # Roboflow API configuration
    ROBOFLOW_API_KEY: Optional[str] = None
    ROBOFLOW_MODEL: str = "yolov8n-640" # or customized workspace/project/version
    ROBOFLOW_INFERENCE_URL: str = "https://detect.roboflow.com"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./geocv.db"
    
    # Routing
    ROUTING_PROVIDER: str = "osrm" # osrm | fallback
    OSRM_BASE_URL: str = "https://router.project-osrm.org"
    ROUTING_API_KEY: Optional[str] = None
    
    # Camera Defaults (CAM-001)
    DEFAULT_CAMERA_ID: str = "CAM-001"
    DEFAULT_CAMERA_NAME: str = "Sector-Alpha High Gate"
    DEFAULT_CAMERA_LAT: float = 12.971598
    DEFAULT_CAMERA_LON: float = 77.594566
    DEFAULT_CAMERA_ALTITUDE: float = 15.0 # meters
    DEFAULT_CAMERA_HEADING: float = 45.0 # degrees clockwise from North
    DEFAULT_CAMERA_FOV: float = 72.0 # horizontal field of view degrees
    DEFAULT_CAMERA_RANGE: float = 120.0 # max detection range in meters
    DEFAULT_MOUNTING_HEIGHT: float = 3.5 # meters
    
    # Detection & Tracking parameters
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.50
    DEFAULT_IOU_THRESHOLD: float = 0.45
    DETECTION_FPS: int = 5
    TRACKER_MAX_LOST_FRAMES: int = 30
    
    # Alerts
    DEFAULT_CROWD_THRESHOLD: int = 8
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Demo Mode
    DEMO_MODE_DEFAULT: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

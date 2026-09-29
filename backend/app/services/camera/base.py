from abc import ABC, abstractmethod
from typing import Optional, Tuple, Dict, Any
import numpy as np
import time

class BaseCameraProvider(ABC):
    def __init__(self, camera_id: str, name: str):
        self.camera_id = camera_id
        self.name = name
        self.is_running = False
        self.fps = 0.0
        self.latency_ms = 0.0
        self.dropped_frames = 0
        self.last_frame_time = 0.0
        self.status = "OFFLINE"

    @abstractmethod
    async def start(self) -> bool:
        """Start the camera stream capture loop"""
        pass

    @abstractmethod
    async def stop(self) -> None:
        """Stop the camera stream"""
        pass

    @abstractmethod
    def get_latest_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Retrieve the most recent frame as a BGR numpy array"""
        pass

    @abstractmethod
    def get_jpeg_bytes(self) -> Optional[bytes]:
        """Retrieve the latest frame encoded as JPEG bytes"""
        pass

    def get_stats(self) -> Dict[str, Any]:
        """Return real-time stream health metrics"""
        now = time.time()
        last_frame_ago = round(now - self.last_frame_time, 2) if self.last_frame_time > 0 else None
        return {
            "camera_id": self.camera_id,
            "status": self.status,
            "fps": round(self.fps, 1),
            "latency_ms": round(self.latency_ms, 1),
            "dropped_frames": self.dropped_frames,
            "last_frame_seconds_ago": last_frame_ago
        }

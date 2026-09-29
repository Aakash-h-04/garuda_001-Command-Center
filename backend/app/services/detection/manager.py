from typing import Dict, Any, List, Optional
import numpy as np
from app.services.detection.base import BaseDetectionProvider
from app.services.detection.roboflow_provider import RoboflowDetectionProvider
from app.services.detection.yolo_provider import LocalYoloDetectionProvider
from app.services.detection.simulated_provider import SimulatedDetectionProvider
from app.core.config import settings

class DetectionManager:
    def __init__(self):
        self.providers: Dict[str, BaseDetectionProvider] = {
            "roboflow": RoboflowDetectionProvider(),
            "yolo": LocalYoloDetectionProvider(),
            "simulated": SimulatedDetectionProvider(),
        }
        # Choose initial active provider based on whether Roboflow API key exists
        if settings.ROBOFLOW_API_KEY:
            self.active_provider_name = "roboflow"
        else:
            self.active_provider_name = "simulated"

    def set_provider(self, name: str, **kwargs):
        if name == "roboflow":
            self.providers["roboflow"] = RoboflowDetectionProvider(
                api_key=kwargs.get("api_key"),
                model_id=kwargs.get("model_id")
            )
            self.active_provider_name = "roboflow"
        elif name == "yolo":
            self.providers["yolo"] = LocalYoloDetectionProvider(
                model_path=kwargs.get("model_path", "yolov8n.pt")
            )
            self.active_provider_name = "yolo"
        elif name == "simulated":
            self.active_provider_name = "simulated"

    def get_active_provider(self) -> BaseDetectionProvider:
        return self.providers.get(self.active_provider_name, self.providers["simulated"])

    async def detect(self, frame: np.ndarray, confidence_threshold: float = 0.50) -> List[Dict[str, Any]]:
        provider = self.get_active_provider()
        return await provider.detect(frame, confidence_threshold=confidence_threshold)

    def get_status(self) -> Dict[str, Any]:
        prov = self.get_active_provider()
        return {
            "active_provider": self.active_provider_name,
            "provider_title": prov.name,
            "is_ready": prov.is_ready,
            "last_latency_ms": round(prov.last_inference_latency_ms, 1)
        }

detection_manager = DetectionManager()

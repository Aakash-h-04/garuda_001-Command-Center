import time
import numpy as np
from typing import List, Dict, Any
from app.services.detection.base import BaseDetectionProvider
from app.services.camera.manager import camera_manager
from app.services.camera.demo_provider import DemoStreamProvider

class SimulatedDetectionProvider(BaseDetectionProvider):
    def __init__(self):
        super().__init__("Simulated Synthetic Detector")
        self.is_ready = True

    async def detect(self, frame: np.ndarray, confidence_threshold: float = 0.50) -> List[Dict[str, Any]]:
        start_time = time.time()
        
        # Check if the active camera is a DemoStreamProvider to query ground truth
        provider = camera_manager.get_provider(camera_manager.active_camera_id)
        if isinstance(provider, DemoStreamProvider):
            raw_boxes = provider.get_simulated_ground_truth_bboxes()
            detections = []
            for b in raw_boxes:
                if b["confidence"] >= confidence_threshold:
                    detections.append({
                        "class": "person",
                        "confidence": b["confidence"],
                        "bbox": b["bbox"]
                    })
            self.last_inference_latency_ms = (time.time() - start_time) * 1000.0 + 12.0 # simulated ~12ms inference
            return detections

        self.last_inference_latency_ms = 5.0
        return []

import time
import numpy as np
from typing import List, Dict, Any, Optional
from app.services.detection.base import BaseDetectionProvider
import logging

logger = logging.getLogger(__name__)

class LocalYoloDetectionProvider(BaseDetectionProvider):
    """
    Modular adapter for local YOLO (Ultralytics YOLOv8 / YOLO11 / ONNX Runtime).
    Can be dynamically loaded when local GPU/CPU inference weights are provided.
    """
    def __init__(self, model_path: str = "yolov8n.pt"):
        super().__init__("Local YOLO Engine")
        self.model_path = model_path
        self.model = None
        self._init_model()

    def _init_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            self.is_ready = True
            logger.info(f"Loaded local YOLO model from {self.model_path}")
        except ImportError:
            self.is_ready = False
            logger.info("Ultralytics package not installed. Local YOLO adapter is standby.")
        except Exception as e:
            self.is_ready = False
            logger.warning(f"Could not load local YOLO model: {e}")

    async def detect(self, frame: np.ndarray, confidence_threshold: float = 0.50) -> List[Dict[str, Any]]:
        if not self.is_ready or self.model is None:
            return []

        start_time = time.time()
        try:
            # Run inference (class 0 is person in COCO)
            results = self.model(frame, classes=[0], conf=confidence_threshold, verbose=False)
            self.last_inference_latency_ms = (time.time() - start_time) * 1000.0

            detections = []
            for r in results:
                for box in r.boxes:
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = xyxy
                    detections.append({
                        "class": "person",
                        "confidence": round(conf, 3),
                        "bbox": {
                            "x": float(x1),
                            "y": float(y1),
                            "width": float(x2 - x1),
                            "height": float(y2 - y1)
                        }
                    })
            return detections
        except Exception as e:
            self.last_inference_latency_ms = (time.time() - start_time) * 1000.0
            logger.error(f"Local YOLO inference error: {e}")
            return []

import time
import httpx
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from app.services.detection.base import BaseDetectionProvider
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class RoboflowDetectionProvider(BaseDetectionProvider):
    def __init__(self, api_key: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__("Roboflow Inference API")
        self.api_key = api_key or settings.ROBOFLOW_API_KEY
        self.model_id = model_id or settings.ROBOFLOW_MODEL
        self.base_url = settings.ROBOFLOW_INFERENCE_URL
        self.is_ready = bool(self.api_key)

    async def detect(self, frame: np.ndarray, confidence_threshold: float = 0.50) -> List[Dict[str, Any]]:
        if not self.api_key:
            logger.warning("Roboflow API key not configured.")
            return []

        start_time = time.time()
        try:
            # Encode frame to JPEG bytes
            ret, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if not ret:
                return []

            jpeg_bytes = buf.tobytes()
            url = f"{self.base_url}/{self.model_id}"
            params = {
                "api_key": self.api_key,
                "confidence": confidence_threshold
            }

            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.post(
                    url,
                    params=params,
                    content=jpeg_bytes,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )

            self.last_inference_latency_ms = (time.time() - start_time) * 1000.0

            if response.status_code != 200:
                logger.warning(f"Roboflow API error {response.status_code}: {response.text}")
                return []

            data = response.json()
            predictions = data.get("predictions", [])
            detections = []

            for p in predictions:
                label = p.get("class", "").lower()
                conf = float(p.get("confidence", 0.0))
                # Only keep person class and filter by confidence
                if "person" in label and conf >= confidence_threshold:
                    # Roboflow provides center x, y
                    cx = float(p.get("x", 0.0))
                    cy = float(p.get("y", 0.0))
                    w = float(p.get("width", 0.0))
                    h = float(p.get("height", 0.0))

                    detections.append({
                        "class": "person",
                        "confidence": round(conf, 3),
                        "bbox": {
                            "x": max(0.0, cx - w / 2.0),
                            "y": max(0.0, cy - h / 2.0),
                            "width": w,
                            "height": h
                        }
                    })

            return detections

        except Exception as e:
            self.last_inference_latency_ms = (time.time() - start_time) * 1000.0
            logger.error(f"Roboflow inference exception: {e}")
            return []

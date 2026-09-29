from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import numpy as np

class BaseDetectionProvider(ABC):
    def __init__(self, name: str):
        self.name = name
        self.is_ready = False
        self.last_inference_latency_ms = 0.0

    @abstractmethod
    async def detect(self, frame: np.ndarray, confidence_threshold: float = 0.50) -> List[Dict[str, Any]]:
        """
        Run human detection on an input BGR numpy frame.
        Must return list of detections matching:
        [
            {
                "class": "person",
                "confidence": float,
                "bbox": {
                    "x": float,
                    "y": float,
                    "width": float,
                    "height": float
                }
            },
            ...
        ]
        """
        pass

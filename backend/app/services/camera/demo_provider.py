import asyncio
import time
import math
import cv2
import numpy as np
from typing import Optional, Tuple, List, Dict, Any
from app.services.camera.base import BaseCameraProvider

class DemoSimulatedPerson:
    def __init__(self, person_id: str, start_x: float, start_y: float, speed_x: float, speed_y: float, base_h: float = 90):
        self.person_id = person_id
        self.x = start_x
        self.y = start_y
        self.vx = speed_x
        self.vy = speed_y
        self.base_h = base_h
        self.min_y = 120.0
        self.max_y = 330.0
        self.min_x = 60.0
        self.max_x = 580.0

    def update(self, dt: float):
        self.x += self.vx * dt * 40.0
        self.y += self.vy * dt * 25.0

        # Bounce or turn around within perspective bounds
        if self.x < self.min_x:
            self.x = self.min_x
            self.vx = abs(self.vx)
        elif self.x > self.max_x:
            self.x = self.max_x
            self.vx = -abs(self.vx)

        if self.y < self.min_y:
            self.y = self.min_y
            self.vy = abs(self.vy)
        elif self.y > self.max_y:
            self.y = self.max_y
            self.vy = -abs(self.vy)

    def get_bbox(self) -> Tuple[float, float, float, float]:
        # Perspective scaling: objects further away (lower y in image) are smaller
        scale = 0.45 + 0.65 * ((self.y - self.min_y) / (self.max_y - self.min_y + 1e-5))
        h = self.base_h * scale
        w = h * 0.42
        # Ground contact point is bottom-center: (self.x, self.y)
        x = self.x - w / 2.0
        y = self.y - h
        return (x, y, w, h)

class DemoStreamProvider(BaseCameraProvider):
    def __init__(self, camera_id: str = "CAM-001", name: str = "Sector-Alpha Demo Camera"):
        super().__init__(camera_id, name)
        self.width = 640
        self.height = 360
        self.latest_frame: Optional[np.ndarray] = None
        self.latest_jpeg: Optional[bytes] = None
        self.task: Optional[asyncio.Task] = None
        self.persons: List[DemoSimulatedPerson] = [
            DemoSimulatedPerson("P001", 180, 200, 0.7, 0.4, base_h=95),
            DemoSimulatedPerson("P002", 420, 160, -0.6, 0.5, base_h=90),
            DemoSimulatedPerson("P003", 310, 280, 0.5, -0.6, base_h=100),
            DemoSimulatedPerson("P004", 510, 240, -0.4, -0.3, base_h=88),
        ]

    async def start(self) -> bool:
        self.is_running = True
        self.status = "ONLINE"
        self.task = asyncio.create_task(self._capture_loop())
        return True

    async def stop(self) -> None:
        self.is_running = False
        self.status = "OFFLINE"
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

    def get_simulated_ground_truth_bboxes(self) -> List[Dict[str, Any]]:
        """Used by the simulated detection provider to get exact synthetic bounding boxes"""
        bboxes = []
        for p in self.persons:
            x, y, w, h = p.get_bbox()
            bboxes.append({
                "id": p.person_id,
                "class": "person",
                "confidence": round(0.91 + 0.07 * math.sin(time.time() + hash(p.person_id) % 10), 2),
                "bbox": {
                    "x": max(0, x),
                    "y": max(0, y),
                    "width": w,
                    "height": h
                }
            })
        return bboxes

    async def _capture_loop(self):
        last_time = time.time()
        fps_timer = time.time()
        frame_counter = 0

        while self.is_running:
            now = time.time()
            dt = now - last_time
            last_time = now

            # Update simulated people
            for p in self.persons:
                p.update(dt)

            # Render tactical feed
            frame = self._render_frame(now)
            self.latest_frame = frame
            
            # Encode JPEG
            ret, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                self.latest_jpeg = buf.tobytes()

            self.last_frame_time = now
            frame_counter += 1
            if now - fps_timer >= 1.0:
                self.fps = frame_counter / (now - fps_timer)
                frame_counter = 0
                fps_timer = now
                self.latency_ms = dt * 1000.0

            # Target ~25 FPS
            await asyncio.sleep(0.04)

    def _render_frame(self, current_time: float) -> np.ndarray:
        # Create dark tactical canvas (slate-900 background #0f172a)
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        frame[:] = (24, 20, 15) # BGR dark slate

        # Draw perspective ground plane grid lines
        horizon_y = 100
        vanishing_x = self.width // 2

        # Radial perspective lines
        for offset_x in range(0, self.width + 100, 60):
            cv2.line(frame, (vanishing_x, horizon_y), (offset_x - 50, self.height), (45, 38, 30), 1)

        # Transverse ground lines
        for y in [130, 170, 220, 280, 340]:
            cv2.line(frame, (20, y), (self.width - 20, y), (50, 42, 33), 1)

        # Draw calibration reference marks on ground plane
        calib_pts = [(160, 140), (480, 140), (100, 310), (540, 310)]
        for idx, (cx, cy) in enumerate(calib_pts):
            cv2.drawMarker(frame, (cx, cy), (0, 180, 230), markerType=cv2.MARKER_TILTED_CROSS, markerSize=8, thickness=1)
            cv2.putText(frame, f"REF-{idx+1}", (cx + 6, cy - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.32, (0, 180, 230), 1)

        # Render simulated people silhouettes walking on ground
        for p in self.persons:
            x, y, w, h = p.get_bbox()
            cx = int(x + w / 2)
            bot_y = int(y + h)
            
            # Draw ground shadow
            cv2.ellipse(frame, (cx, bot_y), (int(w / 2.2), int(w / 5.5)), 0, 0, 360, (15, 10, 8), -1)

            # Stylized surveillance person figure (head + torso + legs)
            head_r = max(4, int(w * 0.22))
            head_y = int(y + head_r)
            cv2.circle(frame, (cx, head_y), head_r, (180, 210, 220), -1) # Head

            # Torso & Legs polygon
            torso_top = head_y + head_r
            torso_w = int(w * 0.4)
            torso_pts = np.array([
                [cx - torso_w, torso_top],
                [cx + torso_w, torso_top],
                [cx + int(torso_w * 0.8), bot_y],
                [cx - int(torso_w * 0.8), bot_y]
            ], np.int32)
            cv2.fillPoly(frame, [torso_pts], (140, 170, 185))

        # Tactical HUD Overlays
        # 1. Top HUD bar
        time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time))
        cv2.putText(frame, f"CAM: {self.camera_id} [DEMO SIMULATOR]", (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 180), 1, cv2.LINE_AA)
        cv2.putText(frame, f"TIME: {time_str}", (self.width - 230, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (160, 180, 190), 1, cv2.LINE_AA)

        # 2. Camera reticle & crosshair in center
        center_x, center_y = self.width // 2, self.height // 2
        cv2.line(frame, (center_x - 12, center_y), (center_x + 12, center_y), (60, 90, 100), 1)
        cv2.line(frame, (center_x, center_y - 12), (center_x, center_y + 12), (60, 90, 100), 1)

        # 3. Bottom HUD status
        cv2.putText(frame, "STATUS: STREAM ACTIVE | GEO-REF: WGS84 ENABLED", (12, self.height - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (100, 140, 150), 1, cv2.LINE_AA)

        return frame

    def get_latest_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if self.latest_frame is not None:
            return True, self.latest_frame.copy()
        return False, None

    def get_jpeg_bytes(self) -> Optional[bytes]:
        return self.latest_jpeg

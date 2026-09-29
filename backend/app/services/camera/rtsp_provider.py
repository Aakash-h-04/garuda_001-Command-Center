import asyncio
import time
import cv2
import numpy as np
from typing import Optional, Tuple
from app.services.camera.base import BaseCameraProvider

class RTSPProvider(BaseCameraProvider):
    def __init__(self, camera_id: str = "CAM-RTSP", stream_url: str = "rtsp://127.0.0.1:8554/live", name: str = "RTSP Network Camera"):
        super().__init__(camera_id, name)
        self.stream_url = stream_url
        self.cap: Optional[cv2.VideoCapture] = None
        self.latest_frame: Optional[np.ndarray] = None
        self.latest_jpeg: Optional[bytes] = None
        self.task: Optional[asyncio.Task] = None

    async def start(self) -> bool:
        self.is_running = True
        self.status = "CONNECTING"
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
        if self.cap:
            self.cap.release()
            self.cap = None

    async def _capture_loop(self):
        fps_timer = time.time()
        frame_counter = 0

        while self.is_running:
            try:
                if self.cap is None or not self.cap.isOpened():
                    self.cap = await asyncio.to_thread(cv2.VideoCapture, self.stream_url)
                    if not self.cap.isOpened():
                        self.status = "OFFLINE"
                        await asyncio.sleep(2.0)
                        continue
                    self.status = "ONLINE"

                ret, frame = await asyncio.to_thread(self.cap.read)
                now = time.time()
                if not ret or frame is None:
                    self.dropped_frames += 1
                    self.status = "STREAM INTERRUPTED"
                    await asyncio.sleep(0.1)
                    continue

                self.status = "ONLINE"
                self.latest_frame = frame
                ret_enc, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if ret_enc:
                    self.latest_jpeg = buf.tobytes()

                self.last_frame_time = now
                frame_counter += 1
                if now - fps_timer >= 1.0:
                    self.fps = frame_counter / (now - fps_timer)
                    frame_counter = 0
                    fps_timer = now

                await asyncio.sleep(0.01)

            except Exception:
                self.status = "ERROR"
                await asyncio.sleep(2.0)

    def get_latest_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if self.latest_frame is not None:
            return True, self.latest_frame.copy()
        return False, None

    def get_jpeg_bytes(self) -> Optional[bytes]:
        return self.latest_jpeg

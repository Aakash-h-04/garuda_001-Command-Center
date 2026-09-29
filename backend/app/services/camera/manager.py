import asyncio
from typing import Dict, Optional, List, AsyncGenerator
from app.services.camera.base import BaseCameraProvider
from app.services.camera.demo_provider import DemoStreamProvider
from app.services.camera.webcam_provider import WebcamProvider
from app.services.camera.iphone_stream_provider import IPhoneStreamProvider
from app.services.camera.rtsp_provider import RTSPProvider
from app.core.config import settings

class CameraManager:
    def __init__(self):
        self.providers: Dict[str, BaseCameraProvider] = {}
        self.active_camera_id: str = settings.DEFAULT_CAMERA_ID
        default_cam = DemoStreamProvider(
            camera_id=settings.DEFAULT_CAMERA_ID,
            name=settings.DEFAULT_CAMERA_NAME
        )
        self.providers[settings.DEFAULT_CAMERA_ID] = default_cam

    async def initialize(self):
        """Initialize default cameras"""
        default_cam = self.providers.get(settings.DEFAULT_CAMERA_ID)
        if default_cam and not default_cam.is_running:
            await default_cam.start()

    async def set_camera_provider(self, camera_id: str, provider_type: str, stream_url: Optional[str] = None, name: Optional[str] = None):
        """Switch or register a camera provider"""
        old_provider = self.providers.get(camera_id)
        if old_provider:
            await old_provider.stop()

        display_name = name or f"Camera {camera_id}"
        if provider_type == "demo":
            provider = DemoStreamProvider(camera_id=camera_id, name=display_name)
        elif provider_type == "iphone":
            url = stream_url or "http://192.168.1.100:8080/video"
            provider = IPhoneStreamProvider(camera_id=camera_id, stream_url=url, name=display_name)
        elif provider_type == "webcam":
            provider = WebcamProvider(camera_id=camera_id, device_index=0, name=display_name)
        elif provider_type == "rtsp":
            url = stream_url or "rtsp://127.0.0.1:8554/live"
            provider = RTSPProvider(camera_id=camera_id, stream_url=url, name=display_name)
        else:
            provider = DemoStreamProvider(camera_id=camera_id, name=display_name)

        await provider.start()
        self.providers[camera_id] = provider
        return provider

    def get_provider(self, camera_id: str) -> Optional[BaseCameraProvider]:
        return self.providers.get(camera_id)

    def list_cameras(self) -> List[Dict]:
        res = []
        for cid, prov in self.providers.items():
            stats = prov.get_stats()
            res.append({
                "camera_id": cid,
                "name": prov.name,
                "status": stats["status"],
                "fps": stats["fps"],
                "latency_ms": stats["latency_ms"]
            })
        return res

    async def generate_mjpeg_stream(self, camera_id: str) -> AsyncGenerator[bytes, None]:
        provider = self.get_provider(camera_id)
        if not provider:
            return

        while True:
            jpeg = provider.get_jpeg_bytes()
            if jpeg is not None:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
                )
            await asyncio.sleep(0.04)

camera_manager = CameraManager()

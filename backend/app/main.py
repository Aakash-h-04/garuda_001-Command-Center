import asyncio
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import api_router
from app.services.camera.manager import camera_manager
from app.websocket.manager import ws_hub

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Starting camera manager...")
    await camera_manager.initialize()

    logger.info("Starting CV and Geospatial WebSocket pipeline...")
    await ws_hub.start_pipeline()

    yield

    # Shutdown
    logger.info("Shutting down pipeline and camera providers...")
    await ws_hub.stop_pipeline()
    for prov in camera_manager.providers.values():
        await prov.stop()
    await engine.dispose()
    logger.info("Platform shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Real-Time WebSocket Endpoint
@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_hub.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages if any (e.g. ping/heartbeat or camera switch)
            try:
                import json
                msg = json.loads(data)
                action = msg.get("action")
                if action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "time": asyncio.get_event_loop().time()}))
                elif action == "switch_camera":
                    cam_id = msg.get("camera_id")
                    if cam_id and cam_id in camera_manager.providers:
                        camera_manager.active_camera_id = cam_id
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        ws_hub.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_api_health():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"

@pytest.mark.asyncio
async def test_api_cameras_list():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/cameras")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1

@pytest.mark.asyncio
async def test_api_geofences():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/geofences")
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1

@pytest.mark.asyncio
async def test_api_analytics():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/analytics")
        assert res.status_code == 200
        data = res.json()
        assert "time_series_1m" in data
        assert "current_people" in data

@pytest.mark.asyncio
async def test_api_settings():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/settings")
        assert res.status_code == 200
        data = res.json()
        assert "active_detection_provider" in data

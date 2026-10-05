<p align="center">
  <a href="https://youtu.be/HEWustZYlPY?si=3hd6iFLha_e5sofO">
    <img src="https://eaglewingtours.com/wp-content/uploads/2022/06/19-09-18_0819-web.webp" alt="Watch Garuda_001 AI-Powered Autonomous Search & Rescue Drone Video" width="750" style="max-width: 100%;">
  </a>
</p>

# Supporting links: DETAILED REPORT & VIDEO:
https://drive.google.com/drive/folders/1T0hKCXKHpYPZ3sIDRPFIuDG4hhiwatu-?usp=sharing

# GeoSentinel — Real-Time Human Detection & Geospatial Tracking Platform

A modern, production-grade command & monitoring platform that connects to live video feeds (iPhone camera, IP/RTSP cameras, USB webcams, or synthetic simulation), detects and tracks people in real time with persistent IDs, projects image coordinates to real-world WGS84 geographic coordinates using ground-plane homography, visualizes camera and people on an interactive tactical map, and calculates road-network shortest routes from the camera to detected individuals.

---

## Architecture Overview

```
                        [ Video Sources ]
     (iPhone Live Stream / IP Camera / Webcam / Demo Stream)
                                │
                                ▼
                   [ Camera Abstraction Layer ]
                                │
                    ┌───────────┴───────────┐
                    │                       │
           (Capture @ 30 FPS)       (MJPEG Stream Endpoint)
                    │                       │
                    ▼                       ▼
       [ Detection Service (5 FPS) ]    [ Frontend Video Player ]
     (Roboflow API / Local YOLO / Demo)     │
                    │                       │
                    ▼                       ▼
        [ Person Tracker (SORT) ]       [ Canvas Bounding Box Overlay ]
     (Persistent IDs: P001, P002...)         ▲
                    │                        │
                    ▼                        │
       [ Geometric Localization ]            │
    (Bottom-Center Bounding Box Pixel)       │
                    │                        │
                    ▼                        │
      [ 3x3 Planar Homography H ]            │
  (Calibrated Image Pts ↔ WGS84 Coords)      │
                    │                        │
                    ▼                        │
      [ Geo-Coords & Accuracies ]            │
                    │                        │
                    ▼                        │
          [ Geofence & Alerts ]              │
      (Point-in-Polygon Detection)           │
                    │                        │
                    ▼                        │
     [ Routing Engine (OSRM API) ]           │
   (Cached Camera → Person Shortest Path)    │
                    │                        │
                    ▼                        │
       [ Real-Time WebSocket Hub ]           │
        (/ws/live?camera_id=CAM-001)         │
                    │                        │
                    └────────────────────────┼────────────────┐
                                             ▼                ▼
                                      [ Interactive Map ] [ Metrics / Analytics ]
                                    (Leaflet/Carto Dark)  (Charts & Event Logs)
```

---

## Core Capabilities

1. **Camera Provider Abstraction Layer**:
   - **iPhone Live Stream**: Supports HTTP MJPEG / RTSP streams from iOS camera apps (e.g., IP Webcam, Camo, EpocCam) or mobile browser streaming.
   - **Local USB Webcam**: Fallback to local OpenCV camera device (`/dev/video0`).
   - **RTSP IP Camera**: Standard network security camera feeds.
   - **Demo Mode**: Built-in synthetic camera stream producing real JPEG frames with animated walking people on a calibrated ground grid for zero-hardware evaluation.

2. **Detection & Object Tracking (SORT)**:
   - **Roboflow Inference API**: Server-side client with API key safely stored in `.env`.
   - **Local YOLO Plug-in**: Modular adapter for Ultralytics YOLOv8/v11/ONNX models.
   - **SORT Tracker**: IoU association, Kalman position filtering, stable persistent track IDs (`P001`, `P002`...), velocity smoothing, speed in m/s, and 8-point compass bearing.
   - **Decoupled execution**: Ingestion at 30 FPS, CV detection at configurable interval (default 5 FPS), tracking at 30 FPS.

3. **Geographic Localization & Planar Homography**:
   - Explicitly distinguishes image coordinates $(u, v)$ from geographic coordinates $(\text{lat}, \text{lon})$.
   - Uses the bottom-center of the person bounding box $(x + w/2, y + h)$ as the ground contact point.
   - Calculates 3x3 homography matrix $H$ via 4-point (or $N$-point) Direct Linear Transformation (DLT).
   - Accuracy grading: `HIGH` ($\pm 2\text{m}$), `MEDIUM` ($\pm 5\text{m}$), `LOW` ($\pm 12\text{m}$), `UNKNOWN` (uncalibrated).

4. **Interactive Map & Shortest Route**:
   - Tactical dark Leaflet map with CartoDB Dark Matter tiles.
   - Directional camera marker with heading arrow and Field of View (FOV) cone polygon.
   - Real routing engine using OSRM with walking, cycling, and driving profiles.
   - Movement-threshold route caching to prevent redundant API calls.
   - Fallback to exact mathematical Haversine spherical distance when routing is unavailable.

5. **Geofencing & Alerts Engine**:
   - Arbitrary polygonal zones: Safe Zone, Restricted Zone, Monitoring Zone.
   - Ray-casting point-in-polygon algorithm triggers instantaneous alerts upon boundary crossing.
   - High crowd density threshold alerts ($N > 8$).

6. **Privacy-by-Design**:
   - No facial recognition or biometric identification.
   - Anonymous temporary IDs only (`P001`, `P002`...).
   - Configurable retention window and option to disable raw video recording.

---

## Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## Testing

Run the comprehensive pytest test suite covering Haversine calculations, homography calibration, SORT tracker, geofencing, and REST endpoints:

```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/ -v
```

All 18 automated tests pass!

---

## Production Deployment with Docker Compose

To launch PostgreSQL + PostGIS, FastAPI backend, and Vite frontend together:

```bash
docker compose up -d
```

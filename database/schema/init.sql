-- PostgreSQL + PostGIS Schema for Real-Time Human Detection & Geospatial Tracking Platform

CREATE EXTENSION IF NOT EXISTS postgis;

-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    provider_type VARCHAR(32) DEFAULT 'demo',
    stream_url VARCHAR(512),
    latitude DOUBLE PRECISION NOT NULL DEFAULT 12.971598,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 77.594566,
    altitude DOUBLE PRECISION DEFAULT 15.0,
    heading DOUBLE PRECISION DEFAULT 45.0,
    fov DOUBLE PRECISION DEFAULT 72.0,
    max_range DOUBLE PRECISION DEFAULT 120.0,
    mounting_height DOUBLE PRECISION DEFAULT 3.5,
    status VARCHAR(32) DEFAULT 'ONLINE',
    confidence_threshold DOUBLE PRECISION DEFAULT 0.50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detections History Table
CREATE TABLE IF NOT EXISTS detection_records (
    id BIGSERIAL PRIMARY KEY,
    camera_id VARCHAR(64) NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    person_id VARCHAR(32) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    pixel_x DOUBLE PRECISION NOT NULL,
    pixel_y DOUBLE PRECISION NOT NULL,
    pixel_width DOUBLE PRECISION NOT NULL,
    pixel_height DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy VARCHAR(32) DEFAULT 'UNKNOWN',
    distance_meters DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detection_records_camera_time ON detection_records(camera_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_detection_records_person ON detection_records(person_id);

-- Track Summary Table
CREATE TABLE IF NOT EXISTS person_tracks (
    id BIGSERIAL PRIMARY KEY,
    camera_id VARCHAR(64) NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    person_id VARCHAR(32) NOT NULL,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    total_detections INT DEFAULT 1,
    avg_confidence DOUBLE PRECISION DEFAULT 0.0,
    current_lat DOUBLE PRECISION,
    current_lon DOUBLE PRECISION,
    speed_mps DOUBLE PRECISION DEFAULT 0.0,
    direction_compass VARCHAR(8),
    status VARCHAR(32) DEFAULT 'Moving'
);

CREATE INDEX IF NOT EXISTS idx_person_tracks_camera ON person_tracks(camera_id, is_active);

-- Camera Calibrations Table
CREATE TABLE IF NOT EXISTS camera_calibrations (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(64) UNIQUE NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    status VARCHAR(32) DEFAULT 'CALIBRATION REQUIRED',
    points_json TEXT,
    homography_matrix_json TEXT,
    reprojection_error DOUBLE PRECISION,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Geofences Table
CREATE TABLE IF NOT EXISTS geofence_zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    zone_type VARCHAR(32) DEFAULT 'RESTRICTED',
    polygon_json TEXT NOT NULL,
    color VARCHAR(32) DEFAULT '#ef4444',
    alert_on_enter BOOLEAN DEFAULT TRUE,
    alert_on_exit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert Events Table
CREATE TABLE IF NOT EXISTS alert_events (
    id BIGSERIAL PRIMARY KEY,
    camera_id VARCHAR(64) NOT NULL,
    alert_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) DEFAULT 'WARNING',
    message VARCHAR(256) NOT NULL,
    person_id VARCHAR(32),
    zone_id VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_alert_events_timestamp ON alert_events(timestamp DESC);

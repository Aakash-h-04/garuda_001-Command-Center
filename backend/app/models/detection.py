import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, Text, ForeignKey
from app.core.database import Base

class DetectionRecord(Base):
    __tablename__ = "detection_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), index=True, nullable=False)
    person_id = Column(String(32), index=True, nullable=False) # e.g. P001
    confidence = Column(Float, nullable=False)
    pixel_x = Column(Float, nullable=False)
    pixel_y = Column(Float, nullable=False)
    pixel_width = Column(Float, nullable=False)
    pixel_height = Column(Float, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_accuracy = Column(String(32), default="UNKNOWN") # HIGH, MEDIUM, LOW, UNKNOWN
    distance_meters = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class PersonTrack(Base):
    __tablename__ = "person_tracks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), index=True, nullable=False)
    person_id = Column(String(32), index=True, nullable=False)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    total_detections = Column(Integer, default=1)
    avg_confidence = Column(Float, default=0.0)
    current_lat = Column(Float, nullable=True)
    current_lon = Column(Float, nullable=True)
    speed_mps = Column(Float, default=0.0)
    direction_compass = Column(String(8), nullable=True) # N, NE, E, etc.
    status = Column(String(32), default="Moving") # Stationary, Moving, Lost

class CameraCalibration(Base):
    __tablename__ = "camera_calibrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(String(32), default="CALIBRATION REQUIRED") # CALIBRATED, CALIBRATION REQUIRED
    points_json = Column(Text, nullable=True) # JSON list of {image: [u, v], geo: [lat, lon]}
    homography_matrix_json = Column(Text, nullable=True) # 3x3 serialized array
    reprojection_error = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

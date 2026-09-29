import datetime
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text
from app.core.database import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True, index=True) # e.g. CAM-001
    name = Column(String(128), nullable=False)
    provider_type = Column(String(32), default="demo") # iphone, webcam, rtsp, demo
    stream_url = Column(String(512), nullable=True)
    latitude = Column(Float, nullable=False, default=12.971598)
    longitude = Column(Float, nullable=False, default=77.594566)
    altitude = Column(Float, nullable=True, default=15.0)
    heading = Column(Float, nullable=True, default=45.0) # degrees
    fov = Column(Float, nullable=True, default=72.0) # degrees
    max_range = Column(Float, nullable=True, default=120.0) # meters
    mounting_height = Column(Float, nullable=True, default=3.5) # meters
    status = Column(String(32), default="ONLINE") # ONLINE, OFFLINE, ERROR
    confidence_threshold = Column(Float, default=0.50)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

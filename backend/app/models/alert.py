import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, Text
from app.core.database import Base

class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), index=True, nullable=False)
    alert_type = Column(String(64), nullable=False) # GEOFENCE_BREACH, CROWD_DENSITY, CAMERA_OFFLINE, LOW_CONFIDENCE
    severity = Column(String(32), default="WARNING") # INFO, WARNING, CRITICAL
    message = Column(String(256), nullable=False)
    person_id = Column(String(32), nullable=True)
    zone_id = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)

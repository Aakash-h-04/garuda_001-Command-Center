import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, Text
from app.core.database import Base

class GeofenceZone(Base):
    __tablename__ = "geofence_zones"

    id = Column(String(64), primary_key=True) # e.g. ZONE-01
    name = Column(String(128), nullable=False)
    zone_type = Column(String(32), default="RESTRICTED") # SAFE, RESTRICTED, MONITORING
    polygon_json = Column(Text, nullable=False) # JSON array of [[lat, lon], ...]
    color = Column(String(32), default="#ef4444") # Hex color for map
    alert_on_enter = Column(Boolean, default=True)
    alert_on_exit = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

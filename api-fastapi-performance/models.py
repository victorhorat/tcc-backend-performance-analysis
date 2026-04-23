from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship
from database import Base

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(String, primary_key=True) # Ex: "sensor-01"
    api_key = Column(String, nullable=False)
    name = Column(String)
    location = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento: Um sensor tem muitas telemetrias
    telemetries = relationship("Telemetry", back_populates="sensor", cascade="all, delete-orphan")

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Mudança para Foreign Key vinculada à tabela sensors
    sensor_id = Column(String, ForeignKey("sensors.id"), nullable=False, index=True)
    
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relacionamento: Muitas telemetrias pertencem a um sensor
    sensor = relationship("Sensor", back_populates="telemetries")
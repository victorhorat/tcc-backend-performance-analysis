from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

# Esquemas de Telemetria
class TelemetryBase(BaseModel):
    sensor_id: str = Field(..., alias='sensorId', min_length=1)
    value: float = Field(..., gt=0)
    unit: str

    model_config = ConfigDict(populate_by_name=True)

class TelemetryCreate(TelemetryBase):
    api_key: str = Field(..., alias='apiKey', min_length=1)

class Telemetry(TelemetryBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Esquemas de Sensores (Gestão)
class SensorBase(BaseModel):
    id: str = Field(..., min_length=1)
    name: Optional[str] = None
    location: Optional[str] = None

class SensorCreate(SensorBase):
    api_key: str = Field(..., min_length=1)

class Sensor(SensorBase):
    api_key: str
    created_at: datetime

    class Config:
        from_attributes = True
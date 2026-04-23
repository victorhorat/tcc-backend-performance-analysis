from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models, schemas, crud
from database import AsyncSessionLocal, engine
from typing import List


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)


# Dependência do Banco (assíncrona)
async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


# --- ROTAS DE TELEMETRIA ---

@app.get("/api/telemetry/sensor/{sensor_id}")
async def get_by_sensor(sensor_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.get_telemetry_by_sensor(db, sensor_id=sensor_id)

@app.get("/api/telemetry/sensor/{sensor_id}/average")
async def get_average(sensor_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.get_average_by_sensor(db, sensor_id=sensor_id)

@app.post("/api/telemetry", response_model=schemas.Telemetry, status_code=status.HTTP_201_CREATED)
async def create(telemetry: schemas.TelemetryCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_telemetry_with_validation(db, telemetry_dto=telemetry)

@app.post("/api/telemetry/bulk", response_model=List[schemas.Telemetry], status_code=status.HTTP_201_CREATED)
async def create_bulk(telemetries: List[schemas.TelemetryCreate], db: AsyncSession = Depends(get_db)):
    return await crud.create_telemetry_bulk(db, telemetries=telemetries)


# --- ROTAS DE SENSORES ---

@app.post("/api/sensors", response_model=schemas.Sensor, status_code=status.HTTP_201_CREATED)
async def create_sensor(sensor: schemas.SensorCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_sensor(db=db, sensor=sensor)

@app.get("/api/sensors", response_model=List[schemas.Sensor])
async def list_sensors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Sensor))
    return result.scalars().all()

@app.delete("/api/sensors/{sensor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sensor(sensor_id: str, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_sensor(db=db, sensor_id=sensor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sensor não encontrado")
    return None

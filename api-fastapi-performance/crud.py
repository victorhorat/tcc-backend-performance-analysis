from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
import models, schemas


async def get_sensor_by_id_and_key(db: AsyncSession, sensor_id: str, api_key: str):
    result = await db.execute(
        select(models.Sensor).filter(
            models.Sensor.id == sensor_id,
            models.Sensor.api_key == api_key
        )
    )
    return result.scalar_one_or_none()


# LEITURA POR SENSOR: Retorna todas as leituras de um sensor específico.
async def get_telemetry_by_sensor(db: AsyncSession, sensor_id: str):
    result = await db.execute(
        select(models.Telemetry).filter(models.Telemetry.sensor_id == sensor_id)
    )
    return result.scalars().all()


# ESCRITA ÚNICA COM VALIDAÇÃO: O coração do teste de carga no Cenário B.
async def create_telemetry_with_validation(db: AsyncSession, telemetry_dto: schemas.TelemetryCreate):
    # 1. Validação de Identidade (Custo de Leitura I/O)
    sensor = await get_sensor_by_id_and_key(db, telemetry_dto.sensor_id, telemetry_dto.api_key)

    if not sensor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sensor não autorizado ou chave inválida"
        )

    # 2. Preparação do Objeto (Removemos api_key do DTO para bater com a Model Telemetry)
    data_dict = telemetry_dto.model_dump()
    data_dict.pop("api_key")  # A tabela telemetry não possui esta coluna

    db_item = models.Telemetry(**data_dict)

    # 3. Persistência
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


# ESCRITA EM MASSA (BULK): Implementação com validação por item.
# Nota para o TCC: Validar cada item reduz a performance mas garante integridade.
async def create_telemetry_bulk(db: AsyncSession, telemetries: list[schemas.TelemetryCreate]):
    db_items = []
    for t_dto in telemetries:
        sensor = await get_sensor_by_id_and_key(db, t_dto.sensor_id, t_dto.api_key)
        if sensor:
            data_dict = t_dto.model_dump()
            data_dict.pop("api_key")
            db_items.append(models.Telemetry(**data_dict))

    if db_items:
        db.add_all(db_items)
        await db.commit()
    return db_items


# CÁLCULO AGREGADO (SQL NATIVO): Mantido como um ponto de comparação contra o Spring.
async def get_average_by_sensor(db: AsyncSession, sensor_id: str):
    result = await db.execute(
        select(func.avg(models.Telemetry.value)).filter(
            models.Telemetry.sensor_id == sensor_id
        )
    )
    val = result.scalar()
    return val if val is not None else 0.0


# GESTÃO DE SENSORES: CRUD básico para popular o banco antes do teste de carga.
async def create_sensor(db: AsyncSession, sensor: schemas.SensorCreate):
    db_sensor = models.Sensor(**sensor.model_dump())
    db.add(db_sensor)
    await db.commit()
    await db.refresh(db_sensor)
    return db_sensor


async def delete_sensor(db: AsyncSession, sensor_id: str):
    result = await db.execute(
        select(models.Sensor).filter(models.Sensor.id == sensor_id)
    )
    db_sensor = result.scalar_one_or_none()
    if db_sensor:
        await db.delete(db_sensor)
        await db.commit()
    return db_sensor

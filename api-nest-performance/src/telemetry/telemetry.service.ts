import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telemetry } from './telemetry.entity';
import { Sensor } from './sensor.entity';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(Telemetry)
    private readonly telemetryRepository: Repository<Telemetry>,
    
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
  ) {}

  // Criação única com Validação de Identidade
  async create(dto: CreateTelemetryDto): Promise<Telemetry> {
    // 1. Busca o sensor validando a chave (SELECT)
    const sensor = await this.sensorRepository.findOne({
      where: { id: dto.sensorId, apiKey: dto.apiKey }
    });

    if (!sensor) {
      throw new UnauthorizedException('Sensor não autorizado ou chave inválida');
    }

    // 2. Cria a entidade vinculando o objeto sensor (Foreign Key)
    const telemetry = this.telemetryRepository.create({
      sensor, // O TypeORM entende a relação pelo objeto
      value: dto.value,
      unit: dto.unit,
    });

    return this.telemetryRepository.save(telemetry);
  }

  // Inserção em massa (Bulk) com validação por item
  async createBulk(dtos: CreateTelemetryDto[]): Promise<Telemetry[]> {
    const validTelemetries: Telemetry[] = [];

    for (const dto of dtos) {
      const sensor = await this.sensorRepository.findOne({
        where: { id: dto.sensorId, apiKey: dto.apiKey }
      });

      if (sensor) {
        validTelemetries.push(
          this.telemetryRepository.create({ sensor, value: dto.value, unit: dto.unit })
        );
      }
    }

    return this.telemetryRepository.save(validTelemetries);
  }

  // Consultas mantidas para comparação
  async findBySensor(sensorId: string): Promise<Telemetry[]> {
    return this.telemetryRepository.find({
      where: { sensor: { id: sensorId } }, // Ajustado para a nova relação
      relations: ['sensor']
    });
  }

  async calculateAverage(sensorId: string): Promise<number> {
    const result = await this.telemetryRepository
      .createQueryBuilder('t')
      .select('AVG(t.value)', 'avg')
      .where('t.sensor_id = :sensorId', { sensorId })
      .getRawOne();
    
    return parseFloat(result.avg) || 0;
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './sensor.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SensorService {
  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
  ) {}

  async create(sensorData: Partial<Sensor>): Promise<Sensor> {
    // Gera uma API Key aleatória caso não seja fornecida
    if (!sensorData.apiKey) {
      sensorData.apiKey = uuidv4();
    }
    const sensor = this.sensorRepository.create(sensorData);
    return this.sensorRepository.save(sensor);
  }

  async findAll(): Promise<Sensor[]> {
    return this.sensorRepository.find();
  }

  async findOne(id: string): Promise<Sensor> {
    const sensor = await this.sensorRepository.findOne({ where: { id } });
    if (!sensor) {
      throw new NotFoundException(`Sensor com ID ${id} não encontrado`);
    }
    return sensor;
  }

  async remove(id: string): Promise<void> {
    const result = await this.sensorRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Sensor com ID ${id} não encontrado`);
    }
  }
}
import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { Sensor } from './sensor.entity';

@Controller('sensors')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() sensorData: Partial<Sensor>) {
    return this.sensorService.create(sensorData);
  }

  @Get()
  async findAll() {
    return this.sensorService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sensorService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.sensorService.remove(id);
  }
}
import { Controller, Get, Post, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';

@Controller('telemetry') // Adicionado prefixo /api para padronizar com os outros frameworks
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('sensor/:sensorId')
  async getBySensor(@Param('sensorId') sensorId: string) {
    return this.telemetryService.findBySensor(sensorId);
  }

  @Get('sensor/:sensorId/average')
  async getAverage(@Param('sensorId') sensorId: string) {
    const average = await this.telemetryService.calculateAverage(sensorId);
    return { sensorId, average };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTelemetryDto: CreateTelemetryDto) {
    // Agora chama o método de criação com validação de API Key
    return this.telemetryService.create(createTelemetryDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(@Body() createTelemetryDtos: CreateTelemetryDto[]) {
    // Envia a lista para o processamento em lote (Bulk)
    return this.telemetryService.createBulk(createTelemetryDtos);
  }
}
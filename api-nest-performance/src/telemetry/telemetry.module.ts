import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { Telemetry } from './telemetry.entity';
import { Sensor } from './sensor.entity';

@Module({
  imports: [
    // Registra a entidade Telemetry para ser usada no Service
    TypeOrmModule.forFeature([Telemetry, Sensor])
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService],
})
export class TelemetryModule {}
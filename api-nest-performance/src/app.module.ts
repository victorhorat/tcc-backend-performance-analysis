import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryModule } from './telemetry/telemetry.module';
import { SensorsModule } from './/telemetry/sensors.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'user_tcc',
      password: 'password_tcc',
      database: 'telemetry_db',
      autoLoadEntities: true,
      synchronize: false,
    }),
    SensorsModule,
    TelemetryModule,
  ],
})
export class AppModule {}
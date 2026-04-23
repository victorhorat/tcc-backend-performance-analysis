import { Entity, Column, PrimaryColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Telemetry } from './telemetry.entity';

@Entity('sensors')
export class Sensor {
  @PrimaryColumn()
  id: string; // Ex: 'sensor-01'

  @Column({ name: 'api_key', nullable: false })
  apiKey: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  location: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Telemetry, (telemetry) => telemetry.sensor, { cascade: true })
  telemetries: Telemetry[];
}
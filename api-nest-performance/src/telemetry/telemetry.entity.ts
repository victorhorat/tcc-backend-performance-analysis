import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Sensor } from './sensor.entity';

@Entity('telemetry')
export class Telemetry {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Sensor, (sensor) => sensor.telemetries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sensor_id' })
  sensor!: Sensor;

  @Column('float')
  value!: number;

  @Column()
  unit!: string;

  @CreateDateColumn()
  timestamp!: Date;
}
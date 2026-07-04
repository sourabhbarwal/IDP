import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AlertSeverity } from '../../../domain/enums/alert-severity.enum';
import { AlertStatus } from '../../../domain/enums/alert-status.enum';

@Entity({ schema: 'alert', name: 'alert_events' })
export class AlertEventOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'alert_name', type: 'varchar', length: 200 }) alertName!: string;
  @Column({ type: 'varchar', length: 20 }) severity!: AlertSeverity;
  @Index() @Column({ type: 'varchar', length: 20, default: AlertStatus.FIRING }) status!: AlertStatus;
  @Column({ type: 'varchar', length: 150, nullable: true }) namespace!: string | null;
  @Column({ name: 'service_id', type: 'uuid', nullable: true }) serviceId!: string | null;
  @Column({ type: 'jsonb', default: '{}' }) labels!: Record<string, string>;
  @Column({ type: 'jsonb', default: '{}' }) annotations!: Record<string, string>;
  @Column({ name: 'starts_at', type: 'timestamptz' }) startsAt!: Date;
  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true }) endsAt!: Date | null;
  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true }) acknowledgedBy!: string | null;
  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true }) acknowledgedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AlertSeverity } from '../../../domain/enums/alert-severity.enum';

@Entity({ schema: 'alert', name: 'alert_rules' })
export class AlertRuleOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200, unique: true }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'promql_expression', type: 'text' }) promqlExpression!: string;
  @Column({ name: 'for_duration', type: 'varchar', length: 20, default: '5m' }) forDuration!: string;
  @Column({ type: 'varchar', length: 20 }) severity!: AlertSeverity;
  @Column({ name: 'service_id', type: 'uuid', nullable: true }) serviceId!: string | null;
  @Column({ type: 'jsonb', default: '{}' }) labels!: Record<string, string>;
  @Column({ type: 'jsonb', default: '{}' }) annotations!: Record<string, string>;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
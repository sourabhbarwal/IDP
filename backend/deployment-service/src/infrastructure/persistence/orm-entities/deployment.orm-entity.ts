import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DeploymentStrategy } from '../../../domain/enums/deployment-strategy.enum';
import { DeploymentStatus } from '../../../domain/enums/deployment-status.enum';
import { EnvironmentName } from '../../../domain/enums/environment-name.enum';

@Entity({ schema: 'deployment', name: 'deployments' })
export class DeploymentOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Index() @Column({ name: 'service_id', type: 'uuid' }) serviceId!: string;
  @Column({ name: 'service_name', type: 'varchar', length: 100 }) serviceName!: string;
  @Index() @Column({ type: 'varchar', length: 20 }) environment!: EnvironmentName;
  @Column({ type: 'varchar', length: 150 }) namespace!: string;
  @Column({ name: 'image_tag', type: 'varchar', length: 200 }) imageTag!: string;
  @Column({ type: 'varchar', length: 20 }) strategy!: DeploymentStrategy;
  @Column({ type: 'varchar', length: 20, default: DeploymentStatus.PENDING }) status!: DeploymentStatus;
  @Column({ name: 'previous_image_tag', type: 'varchar', length: 200, nullable: true })
  previousImageTag!: string | null;
  @Column({ type: 'int', default: 1 }) replicas!: number;
  @Column({ name: 'canary_weight', type: 'int', nullable: true }) canaryWeight!: number | null;
  @Column({ name: 'error_message', type: 'text', nullable: true }) errorMessage!: string | null;
  @Column({ name: 'triggered_by', type: 'uuid' }) triggeredBy!: string;
  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Local audit log fallback (auth-service writes here directly via
 * LocalAuditPublisher). Once `audit-service` exists, events are also/instead
 * published to Redis Streams - see ADR-0002 and AuditPublisher port.
 */
@Entity({ schema: 'auth', name: 'audit_logs' })
export class AuditLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 64 })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 128, nullable: true })
  resourceId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  result!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

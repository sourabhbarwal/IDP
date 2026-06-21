import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, PrimaryGeneratedColumn, JoinColumn,
} from 'typeorm';
import { ServiceOrmEntity } from './service.orm-entity';

@Entity({ schema: 'catalog', name: 'service_versions' })
export class ServiceVersionOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Index()
  @Column({ name: 'service_id', type: 'uuid' }) serviceId!: string;

  @ManyToOne(() => ServiceOrmEntity, (s) => s.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceOrmEntity;

  @Column({ type: 'varchar', length: 50 }) version!: string;
  @Column({ type: 'text', nullable: true }) changelog!: string | null;
  @Column({ name: 'deployed_at', type: 'timestamptz', nullable: true }) deployedAt!: Date | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) environment!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
}
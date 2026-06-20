import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { ServiceType } from '../../../domain/enums/service-type.enum';
import { ServiceStatus } from '../../../domain/enums/service-status.enum';
import { ServiceVersionOrmEntity } from './service-version.orm-entity';

@Entity({ schema: 'catalog', name: 'services' })
export class ServiceOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true }) description!: string | null;

  @Column({ type: 'varchar', length: 50 }) type!: ServiceType;

  @Column({ type: 'varchar', length: 50, default: ServiceStatus.ACTIVE })
  status!: ServiceStatus;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' }) ownerId!: string;

  @Column({ name: 'owner_email', type: 'varchar', length: 255 })
  ownerEmail!: string;

  @Column({ type: 'varchar', length: 100, nullable: true }) team!: string | null;

  @Column({ name: 'repository_url', type: 'varchar', length: 500, nullable: true })
  repositoryUrl!: string | null;

  @Column({ type: 'text', array: true, default: '{}' }) tags!: string[];

  @OneToMany(() => ServiceVersionOrmEntity, (v) => v.service, { cascade: true })
  versions!: ServiceVersionOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
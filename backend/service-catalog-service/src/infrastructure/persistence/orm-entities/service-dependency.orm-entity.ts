import {
  Column, CreateDateColumn, Entity,
  PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { DependencyType } from '../../../domain/enums/dependency-type.enum';

@Entity({ schema: 'catalog', name: 'service_dependencies' })
@Unique(['serviceId', 'dependencyId'])
export class ServiceDependencyOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId!: string;

  @Column({ name: 'dependency_id', type: 'uuid' })
  dependencyId!: string;

  @Column({
    name: 'dependency_type',
    type: 'enum',
    enum: DependencyType,
    default: DependencyType.HARD,
  })
  dependencyType!: DependencyType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
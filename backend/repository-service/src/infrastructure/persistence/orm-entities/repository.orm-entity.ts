import {
  Column, CreateDateColumn, Entity, Index,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { RepositoryStatus } from '../../../domain/enums/repository-status.enum';
import { RepositoryVisibility } from '../../../domain/enums/repository-visibility.enum';

@Entity({ schema: 'repository', name: 'repositories' })
export class RepositoryOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'service_id', type: 'uuid', unique: true }) serviceId!: string;
  @Column({ name: 'service_name', type: 'varchar', length: 100 }) serviceName!: string;
  @Column({ name: 'service_type', type: 'varchar', length: 50 }) serviceType!: string;
  @Column({ name: 'github_owner', type: 'varchar', length: 100 }) githubOwner!: string;
  @Column({ name: 'github_repo', type: 'varchar', length: 100 }) githubRepo!: string;
  @Column({ name: 'full_name', type: 'varchar', length: 255 }) fullName!: string;
  @Column({ name: 'default_branch', type: 'varchar', length: 100, default: 'main' }) defaultBranch!: string;
  @Column({ name: 'html_url', type: 'varchar', length: 500 }) htmlUrl!: string;
  @Column({ name: 'clone_url', type: 'varchar', length: 500 }) cloneUrl!: string;
  @Column({ name: 'ssh_url', type: 'varchar', length: 500 }) sshUrl!: string;
  @Column({ type: 'varchar', length: 50, default: RepositoryVisibility.PRIVATE }) visibility!: RepositoryVisibility;
  @Column({ type: 'varchar', length: 50, default: RepositoryStatus.PROVISIONING }) status!: RepositoryStatus;
  @Column({ name: 'provisioned_by', type: 'uuid' }) provisionedBy!: string;
  @Column({ name: 'provisioned_at', type: 'timestamptz', default: () => 'now()' }) provisionedAt!: Date;
  @Column({ name: 'error_message', type: 'text', nullable: true }) errorMessage!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
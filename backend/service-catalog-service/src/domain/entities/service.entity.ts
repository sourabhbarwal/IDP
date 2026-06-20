import { ServiceType } from '../enums/service-type.enum';
import { ServiceStatus } from '../enums/service-status.enum';
import { ServiceVersion } from './service-version.entity';

export interface ServiceProps {
  id: string;
  name: string;
  description: string | null;
  type: ServiceType;
  status: ServiceStatus;
  ownerId: string;
  ownerEmail: string;
  team: string | null;
  repositoryUrl: string | null;
  tags: string[];
  versions: ServiceVersion[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}

/**
 * Service domain entity — the core aggregate in the Service Catalog bounded context.
 * No framework/ORM dependencies (Clean Architecture).
 */
export class Service {
  readonly id!: string;
  readonly name!: string;
  readonly description!: string | null;
  readonly type!: ServiceType;
  readonly status!: ServiceStatus;
  readonly ownerId!: string;
  readonly ownerEmail!: string;
  readonly team!: string | null;
  readonly repositoryUrl!: string | null;
  readonly tags!: string[];
  readonly versions!: ServiceVersion[];
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly createdBy!: string;
  readonly updatedBy!: string | null;

  constructor(props: ServiceProps) {
    Object.assign(this, props);
  }

  isActive(): boolean {
    return this.status === ServiceStatus.ACTIVE;
  }

  latestVersion(): ServiceVersion | null {
    if (this.versions.length === 0) return null;
    return [...this.versions].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
  }
}
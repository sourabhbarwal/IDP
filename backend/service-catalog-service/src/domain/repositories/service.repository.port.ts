import { Service } from '../entities/service.entity';
import { ServiceType } from '../enums/service-type.enum';
import { ServiceStatus } from '../enums/service-status.enum';

export const SERVICE_REPOSITORY = 'SERVICE_REPOSITORY';

export interface ListServicesFilter {
  search?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  ownerId?: string;
  team?: string;
  tags?: string[];
  page: number;
  size: number;
}

export interface ListServicesResult {
  items: Service[];
  total: number;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
  findByName(name: string): Promise<Service | null>;
  existsByName(name: string): Promise<boolean>;
  list(filter: ListServicesFilter): Promise<ListServicesResult>;
  create(params: {
    name: string;
    description: string | null;
    type: ServiceType;
    team: string | null;
    repositoryUrl: string | null;
    tags: string[];
    ownerId: string;
    ownerEmail: string;
    createdBy: string;
  }): Promise<Service>;
  update(id: string, params: {
    description?: string | null;
    type?: ServiceType;
    status?: ServiceStatus;
    team?: string | null;
    repositoryUrl?: string | null;
    tags?: string[];
    updatedBy: string;
  }): Promise<Service>;
  softDelete(id: string): Promise<void>;
}
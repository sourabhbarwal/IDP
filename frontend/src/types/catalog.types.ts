export interface ServiceVersion {
  id: string;
  version: string;
  changelog: string | null;
  deployedAt: string | null;
  environment: string | null;
  createdAt: string;
}

export type ServiceType = 'SPRING_BOOT' | 'NODEJS' | 'FASTAPI' | 'GO' | 'OTHER';
export type ServiceStatus = 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

export interface CatalogService {
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
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
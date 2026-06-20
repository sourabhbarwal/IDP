import { ServiceVersion } from '../entities/service-version.entity';

export const SERVICE_VERSION_REPOSITORY = 'SERVICE_VERSION_REPOSITORY';

export interface ServiceVersionRepository {
  findByServiceId(serviceId: string): Promise<ServiceVersion[]>;
  create(params: {
    serviceId: string;
    version: string;
    changelog: string | null;
    deployedAt: Date | null;
    environment: string | null;
    createdBy: string;
  }): Promise<ServiceVersion>;
}
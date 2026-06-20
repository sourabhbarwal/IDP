import { Inject, Injectable } from '@nestjs/common';
import { Service } from '../../domain/entities/service.entity';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import {
  SERVICE_REPOSITORY,
  ServiceRepository,
  ListServicesResult,
} from '../../domain/repositories/service.repository.port';

export interface ListServicesQuery {
  search?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  ownerId?: string;
  team?: string;
  tags?: string[];
  page: number;
  size: number;
}

@Injectable()
export class ListServicesUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository) {}

  async execute(query: ListServicesQuery): Promise<ListServicesResult> {
    return this.serviceRepository.list({
      search: query.search,
      type: query.type,
      status: query.status,
      ownerId: query.ownerId,
      team: query.team,
      tags: query.tags,
      page: query.page,
      size: Math.min(query.size, 100),
    });
  }
}
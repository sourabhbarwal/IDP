import { Inject, Injectable } from '@nestjs/common';
import { Service } from '../../domain/entities/service.entity';
import { ServiceNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { SERVICE_REPOSITORY, ServiceRepository } from '../../domain/repositories/service.repository.port';

@Injectable()
export class GetServiceUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository) {}

  async execute(id: string): Promise<Service> {
    const service = await this.serviceRepository.findById(id);
    if (!service) throw new ServiceNotFoundError(id);
    return service;
  }
}
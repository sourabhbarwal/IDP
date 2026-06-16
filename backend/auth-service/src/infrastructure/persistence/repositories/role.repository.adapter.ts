import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../domain/entities/role.entity';
import { RoleRepository } from '../../../domain/repositories/role.repository.port';
import { RoleOrmEntity } from '../orm-entities/role.orm-entity';
import { toDomainRole } from './entity-mappers';

@Injectable()
export class RoleRepositoryAdapter implements RoleRepository {
  constructor(@InjectRepository(RoleOrmEntity) private readonly roles: Repository<RoleOrmEntity>) {}

  async findByName(name: string): Promise<Role | null> {
    const entity = await this.roles.findOne({ where: { name }, relations: { permissions: true } });
    return entity ? toDomainRole(entity) : null;
  }

  async findAll(): Promise<Role[]> {
    const entities = await this.roles.find({ relations: { permissions: true } });
    return entities.map(toDomainRole);
  }
}

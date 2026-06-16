import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository.port';
import { UserOrmEntity } from '../orm-entities/user.orm-entity';
import { RoleOrmEntity } from '../orm-entities/role.orm-entity';
import { toDomainUser } from './entity-mappers';

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity) private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(RoleOrmEntity) private readonly roles: Repository<RoleOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.users.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
    return entity ? toDomainUser(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.users.findOne({
      where: { email },
      relations: { roles: { permissions: true } },
    });
    return entity ? toDomainUser(entity) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.users.count({ where: { email } });
    return count > 0;
  }

  async createUser(params: {
    email: string;
    passwordHash: string;
    fullName: string;
    defaultRoleNames: string[];
  }): Promise<User> {
    const defaultRoles = await this.roles.find({
      where: { name: In(params.defaultRoleNames) },
      relations: { permissions: true },
    });

    const entity = this.users.create({
      email: params.email,
      passwordHash: params.passwordHash,
      fullName: params.fullName,
      roles: defaultRoles,
    });

    const saved = await this.users.save(entity);
    // Re-fetch to ensure relations are fully populated for the response/JWT.
    const reloaded = await this.users.findOneOrFail({
      where: { id: saved.id },
      relations: { roles: { permissions: true } },
    });

    return toDomainUser(reloaded);
  }
}

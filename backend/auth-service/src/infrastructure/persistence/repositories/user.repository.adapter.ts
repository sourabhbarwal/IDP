import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository, PaginatedUsers } from '../../../domain/repositories/user.repository.port';
import { UserOrmEntity } from '../orm-entities/user.orm-entity';
import { RoleOrmEntity } from '../orm-entities/role.orm-entity';
import { UserStatus } from '../../../domain/enums/user-status.enum';
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

  async findAll(opts: {
    page: number;
    size: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<PaginatedUsers> {
    const qb = this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC');

    if (opts.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${opts.search}%` },
      );
    }
    if (opts.role) {
      qb.andWhere('role.name = :role', { role: opts.role });
    }
    if (opts.status) {
      qb.andWhere('user.status = :status', { status: opts.status });
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip(opts.page * opts.size)
      .take(opts.size)
      .getMany();

    return {
      content: entities.map(toDomainUser),
      totalElements: total,
      page: opts.page,
      size: opts.size,
      totalPages: Math.ceil(total / opts.size) || 1,
    };
  }

  async updateRoles(userId: string, roleNames: string[]): Promise<User> {
    const entity = await this.users.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!entity) {
      throw new Error(`User ${userId} not found`);
    }

    const newRoles = await this.roles.find({
      where: { name: In(roleNames) },
      relations: { permissions: true },
    });
    entity.roles = newRoles;
    const saved = await this.users.save(entity);

    const reloaded = await this.users.findOneOrFail({
      where: { id: saved.id },
      relations: { roles: { permissions: true } },
    });
    return toDomainUser(reloaded);
  }

  async updateStatus(userId: string, status: string): Promise<User> {
    await this.users.update(userId, { status: status as UserStatus });
    const updated = await this.users.findOneOrFail({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });
    return toDomainUser(updated);
  }

  async softDelete(userId: string): Promise<void> {
    await this.users.update(userId, {
      deletedAt: new Date(),
      status: UserStatus.DISABLED,
    });
  }
}
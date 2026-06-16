import { Permission } from '../../../domain/entities/permission.entity';
import { Role } from '../../../domain/entities/role.entity';
import { User } from '../../../domain/entities/user.entity';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { UserOrmEntity } from '../orm-entities/user.orm-entity';
import { RoleOrmEntity } from '../orm-entities/role.orm-entity';
import { PermissionOrmEntity } from '../orm-entities/permission.orm-entity';
import { RefreshTokenOrmEntity } from '../orm-entities/refresh-token.orm-entity';

export function toDomainPermission(entity: PermissionOrmEntity): Permission {
  return new Permission(entity.id, entity.name, entity.description);
}

export function toDomainRole(entity: RoleOrmEntity): Role {
  const permissions = (entity.permissions ?? []).map(toDomainPermission);
  return new Role(entity.id, entity.name, entity.description, permissions);
}

export function toDomainUser(entity: UserOrmEntity): User {
  return new User({
    id: entity.id,
    email: entity.email,
    passwordHash: entity.passwordHash,
    fullName: entity.fullName,
    status: entity.status,
    organizationId: entity.organizationId,
    roles: (entity.roles ?? []).map(toDomainRole),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function toDomainRefreshToken(entity: RefreshTokenOrmEntity): RefreshToken {
  return new RefreshToken({
    id: entity.id,
    userId: entity.userId,
    tokenHash: entity.tokenHash,
    expiresAt: entity.expiresAt,
    revokedAt: entity.revokedAt,
    replacedByTokenId: entity.replacedByTokenId,
    createdByIp: entity.createdByIp,
    createdAt: entity.createdAt,
  });
}

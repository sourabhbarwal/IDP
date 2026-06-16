import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserOrmEntity } from '../persistence/orm-entities/user.orm-entity';
import { RoleOrmEntity } from '../persistence/orm-entities/role.orm-entity';
import { PermissionOrmEntity } from '../persistence/orm-entities/permission.orm-entity';
import { RefreshTokenOrmEntity } from '../persistence/orm-entities/refresh-token.orm-entity';
import { AuditLogOrmEntity } from '../persistence/orm-entities/audit-log.orm-entity';

export function typeOrmOptionsFactory(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('db.host'),
    port: config.get<number>('db.port'),
    username: config.get<string>('db.username'),
    password: config.get<string>('db.password'),
    database: config.get<string>('db.name'),
    schema: config.get<string>('db.schema'),
    entities: [UserOrmEntity, RoleOrmEntity, PermissionOrmEntity, RefreshTokenOrmEntity, AuditLogOrmEntity],
    // Migrations are run explicitly via `npm run migration:run` (see typeorm.config.ts),
    // never automatically in any environment - synchronize is always false.
    synchronize: false,
    migrationsRun: false,
    logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
  };
}

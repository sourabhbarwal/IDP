import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { UserOrmEntity } from './orm-entities/user.orm-entity';
import { RoleOrmEntity } from './orm-entities/role.orm-entity';
import { PermissionOrmEntity } from './orm-entities/permission.orm-entity';
import { RefreshTokenOrmEntity } from './orm-entities/refresh-token.orm-entity';
import { AuditLogOrmEntity } from './orm-entities/audit-log.orm-entity';

dotenv.config();

/**
 * DataSource used by the TypeORM CLI (`npm run migration:run` / `migration:revert`).
 * The NestJS app itself configures TypeORM via `TypeOrmModule.forRootAsync`
 * (see infrastructure/config/typeorm-options.factory.ts) using the same env vars.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'idp',
  password: process.env.DB_PASSWORD ?? '***REMOVED***',
  database: process.env.DB_NAME ?? 'idp',
  entities: [UserOrmEntity, RoleOrmEntity, PermissionOrmEntity, RefreshTokenOrmEntity, AuditLogOrmEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'auth_migrations',
  schema: 'auth',
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Refusing to start with a default/guessable value for a security-sensitive setting.`);
  }
  return value;
}
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ServiceOrmEntity } from './orm-entities/service.orm-entity';
import { ServiceVersionOrmEntity } from './orm-entities/service-version.orm-entity';
import { AuditLogOrmEntity } from './orm-entities/audit-log.orm-entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'idp',
  password: requireEnv('DB_PASSWORD'),
  database: process.env.DB_NAME ?? 'idp',
  schema: 'catalog',
  entities: [ServiceOrmEntity, ServiceVersionOrmEntity, AuditLogOrmEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'catalog_migrations',
});
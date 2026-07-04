import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { AlertRuleOrmEntity } from './orm-entities/alert-rule.orm-entity';
import { AlertEventOrmEntity } from './orm-entities/alert-event.orm-entity';
import { AuditLogOrmEntity } from './orm-entities/audit-log.orm-entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'idp',
  password: process.env.DB_PASSWORD ?? '***REMOVED***',
  database: process.env.DB_NAME ?? 'idp',
  schema: 'alert',
  entities: [AlertRuleOrmEntity, AlertEventOrmEntity, AuditLogOrmEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'alert_migrations',
});
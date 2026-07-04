import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AlertRuleOrmEntity } from '../persistence/orm-entities/alert-rule.orm-entity';
import { AlertEventOrmEntity } from '../persistence/orm-entities/alert-event.orm-entity';
import { AuditLogOrmEntity } from '../persistence/orm-entities/audit-log.orm-entity';

export function typeOrmOptionsFactory(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('db.host'),
    port: config.get<number>('db.port'),
    username: config.get<string>('db.username'),
    password: config.get<string>('db.password'),
    database: config.get<string>('db.name'),
    schema: 'alert',
    entities: [AlertRuleOrmEntity, AlertEventOrmEntity, AuditLogOrmEntity],
    synchronize: false,
    migrationsRun: false,
    logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
  };
}
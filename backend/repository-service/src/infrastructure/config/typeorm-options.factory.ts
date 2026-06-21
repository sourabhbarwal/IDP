import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RepositoryOrmEntity } from '../persistence/orm-entities/repository.orm-entity';
import { AuditLogOrmEntity } from '../persistence/orm-entities/audit-log.orm-entity';

export function typeOrmOptionsFactory(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('db.host'),
    port: config.get<number>('db.port'),
    username: config.get<string>('db.username'),
    password: config.get<string>('db.password'),
    database: config.get<string>('db.name'),
    schema: 'repository',
    entities: [RepositoryOrmEntity, AuditLogOrmEntity],
    synchronize: false,
    migrationsRun: false,
    migrations: [__dirname + '/../persistence/migrations/*.{ts,js}'],
    migrationsTableName: 'repository_migrations',
    logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
  };
}
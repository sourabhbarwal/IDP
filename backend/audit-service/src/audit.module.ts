import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@idp/common';
import configuration from './infrastructure/config/configuration';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { AuditQueryService } from './application/audit-query.service';
import { AuditController } from './infrastructure/web/audit.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        username: config.get<string>('db.username'),
        password: config.get<string>('db.password'),
        database: config.get<string>('db.name'),
        // No schema — we query across multiple schemas via raw SQL
        entities: [],
        synchronize: false,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuditController, HealthController],
  providers: [
    JwtStrategy,
    AuditQueryService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AuditModule {}
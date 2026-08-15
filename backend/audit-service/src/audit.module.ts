import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL} from '@idp/common';
import { APP_GUARD } from '@nestjs/core';
import { MetricsModule, MetricsMiddleware, RequestLoggerMiddleware } from '@idp/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
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
    MetricsModule,
  ],
  controllers: [AuditController, HealthController],
  providers: [
    JwtStrategy,
    AuditQueryService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AuditModule implements NestModule {   // ← added implements
  configure(consumer: MiddlewareConsumer): void {        // ← added
    consumer.apply(MetricsMiddleware,RequestLoggerMiddleware).forRoutes('*');
  }
}
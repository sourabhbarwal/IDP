import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import configuration from './infrastructure/config/configuration';
import { typeOrmOptionsFactory } from './infrastructure/config/typeorm-options.factory';
import { ServiceOrmEntity } from './infrastructure/persistence/orm-entities/service.orm-entity';
import { ServiceVersionOrmEntity } from './infrastructure/persistence/orm-entities/service-version.orm-entity';
import { AuditLogOrmEntity } from './infrastructure/persistence/orm-entities/audit-log.orm-entity';
import { ServiceRepositoryAdapter } from './infrastructure/persistence/repositories/service.repository.adapter';
import { ServiceVersionRepositoryAdapter } from './infrastructure/persistence/repositories/service-version.repository.adapter';
import { SERVICE_REPOSITORY } from './domain/repositories/service.repository.port';
import { SERVICE_VERSION_REPOSITORY } from './domain/repositories/service-version.repository.port';
import { AUDIT_PUBLISHER } from '@idp/common';
import { LocalAuditPublisher } from './infrastructure/audit/local-audit-publisher';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { CreateServiceUseCase } from './application/use-cases/create-service.use-case';
import { GetServiceUseCase } from './application/use-cases/get-service.use-case';
import { ListServicesUseCase } from './application/use-cases/list-services.use-case';
import { UpdateServiceUseCase } from './application/use-cases/update-service.use-case';
import { DeleteServiceUseCase } from './application/use-cases/delete-service.use-case';
import { ServicesController } from './infrastructure/web/services.controller';
import { HealthController } from './infrastructure/web/health.controller';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL } from '@idp/common';
import { APP_GUARD } from '@nestjs/core';
import { AddDependencyUseCase } from './application/use-cases/add-dependency.use-case';
import { GetServiceHealthUseCase } from './application/use-cases/get-service-health.use-case';
import { GetDependencyGraphUseCase } from './application/use-cases/get-dependency-graph.use-case';
import { CircuitBreakerRegistry } from '@idp/common';
import { ServiceDependencyOrmEntity } from './infrastructure/persistence/orm-entities/service-dependency.orm-entity';
import { MetricsModule, MetricsMiddleware, RequestLoggerMiddleware } from '@idp/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmOptionsFactory, inject: [ConfigService] }),
    TypeOrmModule.forFeature([ServiceOrmEntity, ServiceVersionOrmEntity, ServiceDependencyOrmEntity, AuditLogOrmEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
    MetricsModule,
  ],
  controllers: [ServicesController, HealthController],
  providers: [
    { provide: SERVICE_REPOSITORY, useClass: ServiceRepositoryAdapter },
    { provide: SERVICE_VERSION_REPOSITORY, useClass: ServiceVersionRepositoryAdapter },
    { provide: AUDIT_PUBLISHER, useClass: LocalAuditPublisher },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    JwtStrategy,
    CreateServiceUseCase,
    GetServiceUseCase,
    ListServicesUseCase,
    UpdateServiceUseCase,
    DeleteServiceUseCase,
    CircuitBreakerRegistry, 
    AddDependencyUseCase,
    GetServiceHealthUseCase, 
    GetDependencyGraphUseCase
  ],
})
export class ServiceCatalogModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
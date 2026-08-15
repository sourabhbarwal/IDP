import { Module ,MiddlewareConsumer, NestModule} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AUDIT_PUBLISHER } from '@idp/common';
import configuration from './infrastructure/config/configuration';
import { typeOrmOptionsFactory } from './infrastructure/config/typeorm-options.factory';
import { DeploymentOrmEntity } from './infrastructure/persistence/orm-entities/deployment.orm-entity';
import { AuditLogOrmEntity } from './infrastructure/persistence/orm-entities/audit-log.orm-entity';
import { DeploymentRepositoryAdapter } from './infrastructure/persistence/repositories/deployment.repository.adapter';
import { DEPLOYMENT_REPOSITORY } from './domain/repositories/deployment.repository.port';
import { KUBERNETES_CLIENT } from './application/ports/kubernetes-client.port';
import { K8sClientAdapter } from './infrastructure/kubernetes/k8s-client.adapter';
import { LocalAuditPublisher } from './infrastructure/audit/local-audit-publisher';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { RollingStrategy } from './application/strategies/rolling-strategy';
import { BlueGreenStrategy } from './application/strategies/blue-green-strategy';
import { CanaryStrategy } from './application/strategies/canary-strategy';
import { CreateDeploymentUseCase } from './application/use-cases/create-deployment.use-case';
import { RollbackDeploymentUseCase } from './application/use-cases/rollback-deployment.use-case';
import { PromoteDeploymentUseCase } from './application/use-cases/promote-deployment.use-case';
import { GetDeploymentUseCase } from './application/use-cases/get-deployment.use-case';
import { ListDeploymentsUseCase } from './application/use-cases/list-deployments.use-case';
import { DeploymentsController } from './infrastructure/web/deployments.controller';
import { HealthController } from './infrastructure/web/health.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL} from '@idp/common';
import { APP_GUARD } from '@nestjs/core';
import { MetricsModule, MetricsMiddleware, RequestLoggerMiddleware } from '@idp/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmOptionsFactory, inject: [ConfigService] }),
    TypeOrmModule.forFeature([DeploymentOrmEntity, AuditLogOrmEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
    MetricsModule,
  ],
  controllers: [DeploymentsController, HealthController],
  providers: [
    { provide: DEPLOYMENT_REPOSITORY, useClass: DeploymentRepositoryAdapter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: KUBERNETES_CLIENT, useClass: K8sClientAdapter },
    { provide: AUDIT_PUBLISHER, useClass: LocalAuditPublisher },
    JwtStrategy,
    RollingStrategy,
    BlueGreenStrategy,
    CanaryStrategy,
    CreateDeploymentUseCase,
    RollbackDeploymentUseCase,
    PromoteDeploymentUseCase,
    GetDeploymentUseCase,
    ListDeploymentsUseCase,
  ],
})
export class DeploymentModule implements NestModule {   // ← added implements
  configure(consumer: MiddlewareConsumer): void {        // ← added
    consumer.apply(MetricsMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import configuration from './infrastructure/config/configuration';
import { typeOrmOptionsFactory } from './infrastructure/config/typeorm-options.factory';
import { RepositoryOrmEntity } from './infrastructure/persistence/orm-entities/repository.orm-entity';
import { AuditLogOrmEntity } from './infrastructure/persistence/orm-entities/audit-log.orm-entity';
import { RepositoryRepositoryAdapter } from './infrastructure/persistence/repositories/repository.repository.adapter';
import { REPOSITORY_REPOSITORY } from './domain/repositories/repository.repository.port';
import { GITHUB_CLIENT } from './application/ports/github-client.port';
import { AUDIT_PUBLISHER } from '@idp/common';
import { OctokitGithubClient } from './infrastructure/github/octokit-github.client';
import { LocalAuditPublisher } from './infrastructure/audit/local-audit-publisher';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { FileGeneratorService } from './application/services/file-generator.service';
import { ProvisionRepositoryUseCase } from './application/use-cases/provision-repository.use-case';
import { GetRepositoryUseCase } from './application/use-cases/get-repository.use-case';
import { ListRepositoriesUseCase } from './application/use-cases/list-repositories.use-case';
import { RepositoriesController } from './infrastructure/web/repositories.controller';
import { HealthController } from './infrastructure/web/health.controller';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MetricsModule, MetricsMiddleware } from '@idp/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL } from '@idp/common';
import { APP_GUARD } from '@nestjs/core';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmOptionsFactory, inject: [ConfigService] }),
    TypeOrmModule.forFeature([RepositoryOrmEntity, AuditLogOrmEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
    MetricsModule,
  ],
  controllers: [RepositoriesController, HealthController ],
  providers: [
    { provide: REPOSITORY_REPOSITORY, useClass: RepositoryRepositoryAdapter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: GITHUB_CLIENT, useClass: OctokitGithubClient },
    { provide: AUDIT_PUBLISHER, useClass: LocalAuditPublisher },
    JwtStrategy,
    FileGeneratorService,
    ProvisionRepositoryUseCase,
    GetRepositoryUseCase,
    ListRepositoriesUseCase,
  ],
})
export class RepositoryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
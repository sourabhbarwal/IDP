import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AUDIT_PUBLISHER } from '@idp/common';
import configuration from './infrastructure/config/configuration';
import { typeOrmOptionsFactory } from './infrastructure/config/typeorm-options.factory';
import { AlertRuleOrmEntity } from './infrastructure/persistence/orm-entities/alert-rule.orm-entity';
import { AlertEventOrmEntity } from './infrastructure/persistence/orm-entities/alert-event.orm-entity';
import { AuditLogOrmEntity } from './infrastructure/persistence/orm-entities/audit-log.orm-entity';
import { AlertRuleRepositoryAdapter } from './infrastructure/persistence/repositories/alert-rule.repository.adapter';
import { AlertEventRepositoryAdapter } from './infrastructure/persistence/repositories/alert-event.repository.adapter';
import { ALERT_RULE_REPOSITORY } from './domain/repositories/alert-rule.repository.port';
import { ALERT_EVENT_REPOSITORY } from './domain/repositories/alert-event.repository.port';
import { LocalAuditPublisher } from './infrastructure/audit/local-audit-publisher';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { CreateAlertRuleUseCase } from './application/use-cases/create-alert-rule.use-case';
import { ListAlertRulesUseCase } from './application/use-cases/list-alert-rules.use-case';
import { GetActiveAlertsUseCase } from './application/use-cases/get-active-alerts.use-case';
import { AcknowledgeAlertUseCase } from './application/use-cases/acknowledge-alert.use-case';
import { ProcessAlertManagerWebhookUseCase } from './application/use-cases/process-alertmanager-webhook.use-case';
import { AlertsController } from './infrastructure/web/alerts.controller';
import { HealthController } from './health/health.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL } from '@idp/common';
import { APP_GUARD } from '@nestjs/core';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmOptionsFactory, inject: [ConfigService] }),
    TypeOrmModule.forFeature([AlertRuleOrmEntity, AlertEventOrmEntity, AuditLogOrmEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AlertsController, HealthController],
  providers: [
    { provide: ALERT_RULE_REPOSITORY, useClass: AlertRuleRepositoryAdapter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: ALERT_EVENT_REPOSITORY, useClass: AlertEventRepositoryAdapter },
    { provide: AUDIT_PUBLISHER, useClass: LocalAuditPublisher },
    JwtStrategy,
    CreateAlertRuleUseCase,
    ListAlertRulesUseCase,
    GetActiveAlertsUseCase,
    AcknowledgeAlertUseCase,
    ProcessAlertManagerWebhookUseCase,
  ],
})
export class AlertModule {}
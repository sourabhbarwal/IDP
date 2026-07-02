import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HealthController } from './health/health.controller';
import { MetricsController } from './infrastructure/web/metrics.controller';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { PrometheusQueryService } from './application/prometheus-query.service';
import { GlobalExceptionFilter } from '@idp/common';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    JwtStrategy,
    PrometheusQueryService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class MonitoringModule {}
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HealthController } from './health/health.controller';
import { MetricsController } from './infrastructure/web/metrics.controller';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { PrometheusQueryService } from './application/prometheus-query.service';
import { GlobalExceptionFilter } from '@idp/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL ,MetricsModule, MetricsMiddleware } from '@idp/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
    MetricsModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    JwtStrategy,
    PrometheusQueryService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class MonitoringModule implements NestModule {   // ← added implements
  configure(consumer: MiddlewareConsumer): void {        // ← added
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@idp/common';
import { HealthController } from './health/health.controller';
import { LogsController } from './infrastructure/web/logs.controller';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { LokiQueryService } from './application/loki-query.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL, MetricsModule, MetricsMiddleware } from '@idp/common';
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
  controllers: [HealthController, LogsController],
  providers: [
    JwtStrategy,
    LokiQueryService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class LoggingModule implements NestModule {   // ← added implements
  configure(consumer: MiddlewareConsumer): void {        // ← added
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
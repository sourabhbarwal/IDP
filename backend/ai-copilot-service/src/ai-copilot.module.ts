import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GlobalExceptionFilter, THROTTLE_CONFIG_GLOBAL } from '@idp/common';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { CopilotService } from './application/copilot.service';
import { GroqClientService } from './application/groq-client.service';
import { PlatformContextService } from './application/platform-context.service';
import { CopilotController } from './infrastructure/web/copilot.controller';
import { HealthController } from './health/health.controller';
import { CircuitBreakerRegistry } from '@idp/common';
import { MetricsModule, MetricsMiddleware, RequestLoggerMiddleware } from '@idp/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
    MetricsModule,   // ← added
  ],
  controllers: [CopilotController, HealthController],
  providers: [
    JwtStrategy,
    CopilotService,
    GroqClientService,
    PlatformContextService,
    CircuitBreakerRegistry,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AiCopilotModule implements NestModule {   // ← added implements
  configure(consumer: MiddlewareConsumer): void {        // ← added
    consumer.apply(MetricsMiddleware,RequestLoggerMiddleware).forRoutes('*');
  }
}
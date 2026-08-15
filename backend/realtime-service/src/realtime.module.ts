import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GlobalExceptionFilter, THROTTLE_CONFIG_GLOBAL, MetricsModule, MetricsMiddleware, RequestLoggerMiddleware} from '@idp/common';
import { EventsGateway } from './infrastructure/websocket/events.gateway';
import { EventsController } from './infrastructure/web/events.controller';
import { HealthController } from './health/health.controller';
import { EventBroadcasterService } from './application/event-broadcaster.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { issuer: config.get<string>('JWT_ISSUER', 'idp-platform') },
      }),
      inject: [ConfigService],
    }),
    MetricsModule,
  ],
  controllers: [EventsController, HealthController],
  providers: [
    EventsGateway,
    EventBroadcasterService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class RealtimeModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
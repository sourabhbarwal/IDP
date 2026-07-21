import { Module, MiddlewareConsumer, NestModule} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@idp/common';
import { NotificationsController } from './infrastructure/web/notifications.controller';
import { HealthController } from './health/health.controller';
import { NotificationDispatcherService } from './application/services/notification-dispatcher.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_GLOBAL, MetricsModule, MetricsMiddleware } from '@idp/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),MetricsModule,],
  controllers: [NotificationsController, HealthController],
  providers: [
    NotificationDispatcherService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class NotificationModule implements NestModule {   // ← added implements
  configure(consumer: MiddlewareConsumer): void {        // ← added
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
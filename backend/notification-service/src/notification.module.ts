import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@idp/common';
import { NotificationsController } from './infrastructure/web/notifications.controller';
import { HealthController } from './health/health.controller';
import { NotificationDispatcherService } from './application/services/notification-dispatcher.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] })],
  controllers: [NotificationsController, HealthController],
  providers: [
    NotificationDispatcherService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class NotificationModule {}
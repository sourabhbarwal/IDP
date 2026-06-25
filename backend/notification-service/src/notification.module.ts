import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';

/** Notification Service — Phase 5 stub. Email/Slack/Discord/Webhook in Phase 8. */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] })],
  controllers: [HealthController],
})
export class NotificationModule {}
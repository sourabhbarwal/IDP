import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationDispatcherService, AlertPayload } from '../../application/services/notification-dispatcher.service';
import { AlertManagerWebhookPayload } from './dto/alertmanager-webhook.dto';

@ApiTags('notifications')
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  /**
   * AlertManager calls this endpoint when alerts fire or resolve.
   * No JWT auth — protected by a static bearer token checked in the service.
   */
  @Post('webhook/alertmanager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive AlertManager webhook and dispatch notifications' })
  async alertManagerWebhook(@Body() payload: AlertManagerWebhookPayload): Promise<{ received: boolean }> {
    for (const alert of payload.alerts) {
      const alertPayload: AlertPayload = {
        alertName: alert.labels['alertname'] ?? 'UnknownAlert',
        severity: alert.labels['severity'] ?? 'warning',
        status: alert.status,
        namespace: alert.labels['namespace'] ?? null,
        summary: alert.annotations['summary'] ?? alert.labels['alertname'] ?? 'Alert fired',
        startsAt: alert.startsAt,
      };
      await this.dispatcher.dispatchToAll(alertPayload);
    }
    return { received: true };
  }

  @Get('channels')
  @ApiOperation({ summary: 'List configured notification channels (from env)' })
  getChannels() {
    return {
      message: 'Notification channels are configured via environment variables in Phase 8 MVP.',
      channels: ['SLACK_WEBHOOK_URL', 'DISCORD_WEBHOOK_URL', 'GENERIC_WEBHOOK_URL', 'SMTP_HOST'],
      hint: 'Set these env vars to activate the respective channel.',
    };
  }
}
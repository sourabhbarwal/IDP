import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '../../domain/enums/channel-type.enum';
import { NotificationChannel } from '../../domain/entities/notification-channel.entity';

export interface AlertPayload {
  alertName: string;
  severity: string;
  status: string;
  namespace: string | null;
  summary: string;
  startsAt: string;
}

/**
 * Dispatches alert notifications to configured channels.
 * Channel configs in this MVP come from environment variables.
 * Phase 10 will allow per-channel DB config via the UI.
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(private readonly config: ConfigService) {}

  async dispatch(alert: AlertPayload, channels: NotificationChannel[]): Promise<void> {
    const activeChannels = channels.filter((c) => c.enabled);

    if (activeChannels.length === 0) {
      this.logger.log('No active notification channels — skipping dispatch');
      return;
    }

    await Promise.allSettled(
      activeChannels.map((channel) => this.sendToChannel(alert, channel)),
    );
  }

  async dispatchToAll(alert: AlertPayload): Promise<void> {
    // Default channels from env vars (MVP approach)
    const channels = this.buildDefaultChannels();
    await this.dispatch(alert, channels);
  }

  private buildDefaultChannels(): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    const slackWebhookUrl = this.config.get<string>('SLACK_WEBHOOK_URL');
    if (slackWebhookUrl) {
      channels.push(new NotificationChannel({
        id: 'slack-default', name: 'Slack Default', type: ChannelType.SLACK,
        enabled: true, config: { webhookUrl: slackWebhookUrl }, createdAt: new Date(),
      }));
    }

    const discordWebhookUrl = this.config.get<string>('DISCORD_WEBHOOK_URL');
    if (discordWebhookUrl) {
      channels.push(new NotificationChannel({
        id: 'discord-default', name: 'Discord Default', type: ChannelType.WEBHOOK,
        enabled: true, config: { url: discordWebhookUrl }, createdAt: new Date(),
      }));
    }

    const genericWebhookUrl = this.config.get<string>('GENERIC_WEBHOOK_URL');
    if (genericWebhookUrl) {
      channels.push(new NotificationChannel({
        id: 'webhook-default', name: 'Generic Webhook', type: ChannelType.WEBHOOK,
        enabled: true, config: { url: genericWebhookUrl }, createdAt: new Date(),
      }));
    }

    return channels;
  }

  private async sendToChannel(alert: AlertPayload, channel: NotificationChannel): Promise<void> {
    try {
      switch (channel.type) {
        case ChannelType.SLACK:
          await this.sendSlack(alert, channel.config['webhookUrl'] ?? '');
          break;
        case ChannelType.WEBHOOK:
          await this.sendWebhook(alert, channel.config['url'] ?? '');
          break;
        case ChannelType.EMAIL:
          await this.sendEmail(alert, channel.config);
          break;
      }
      this.logger.log(`Notification sent via ${channel.type} channel '${channel.name}'`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send via ${channel.type} channel '${channel.name}': ${message}`);
    }
  }

  private async sendSlack(alert: AlertPayload, webhookUrl: string): Promise<void> {
    const severityEmoji = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🟢';
    const statusEmoji = alert.status === 'firing' ? '🚨' : '✅';

    const body = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${statusEmoji} ${alert.status.toUpperCase()}: ${alert.alertName}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Severity:*\n${severityEmoji} ${alert.severity}` },
            { type: 'mrkdwn', text: `*Status:*\n${alert.status}` },
            { type: 'mrkdwn', text: `*Namespace:*\n${alert.namespace ?? 'N/A'}` },
            { type: 'mrkdwn', text: `*Started:*\n${new Date(alert.startsAt).toLocaleString()}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Summary:* ${alert.summary}` },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Slack returned ${response.status}: ${await response.text()}`);
    }
  }

  private async sendWebhook(alert: AlertPayload, url: string): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'IDP-Platform/1.0' },
      body: JSON.stringify({
        source: 'idp-platform',
        alertName: alert.alertName,
        severity: alert.severity,
        status: alert.status,
        namespace: alert.namespace,
        summary: alert.summary,
        startsAt: alert.startsAt,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
  }

  private async sendEmail(alert: AlertPayload, config: Record<string, string>): Promise<void> {
    // Email sending via nodemailer (only initialised if SMTP config is present)
    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (!smtpHost) {
      this.logger.warn('SMTP_HOST not configured — skipping email notification');
      return;
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(this.config.get('SMTP_PORT', '587')),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });

    await transporter.sendMail({
      from: config['from'] ?? 'alerts@idp-platform.local',
      to: config['to'] ?? this.config.get<string>('ALERT_EMAIL_TO'),
      subject: `[${alert.severity.toUpperCase()}] ${alert.alertName} is ${alert.status}`,
      html: `
        <h2>${alert.status === 'firing' ? '🚨' : '✅'} Alert: ${alert.alertName}</h2>
        <table>
          <tr><td><b>Severity</b></td><td>${alert.severity}</td></tr>
          <tr><td><b>Status</b></td><td>${alert.status}</td></tr>
          <tr><td><b>Namespace</b></td><td>${alert.namespace ?? 'N/A'}</td></tr>
          <tr><td><b>Summary</b></td><td>${alert.summary}</td></tr>
          <tr><td><b>Started At</b></td><td>${new Date(alert.startsAt).toLocaleString()}</td></tr>
        </table>
      `,
    });
  }
}
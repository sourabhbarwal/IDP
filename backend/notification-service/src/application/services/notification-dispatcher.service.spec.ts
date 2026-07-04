import { NotificationDispatcherService, AlertPayload } from './notification-dispatcher.service';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../../domain/entities/notification-channel.entity';
import { ChannelType } from '../../domain/enums/channel-type.enum';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(undefined),
  })),
}));

function makeConfig(values: Record<string, string | undefined> = {}): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key in values) return values[key];
      return defaultValue;
    }),
  } as unknown as ConfigService;
}

const testAlert: AlertPayload = {
  alertName: 'HighErrorRate',
  severity: 'critical',
  status: 'firing',
  namespace: 'dev-auth-service',
  summary: 'Error rate exceeded threshold',
  startsAt: new Date().toISOString(),
};

describe('NotificationDispatcherService', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('skips dispatch when no active channels', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    await expect(service.dispatch(testAlert, [])).resolves.toBeUndefined();
  });

  it('skips disabled channels', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const disabledChannel = new NotificationChannel({
      id: 'c-1', name: 'Disabled Slack', type: ChannelType.SLACK,
      enabled: false, config: { webhookUrl: 'http://hooks.slack.com/test' }, createdAt: new Date(),
    });

    await service.dispatch(testAlert, [disabledChannel]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a Slack notification for an enabled SLACK channel', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const slackChannel = new NotificationChannel({
      id: 'c-1', name: 'Slack', type: ChannelType.SLACK,
      enabled: true, config: { webhookUrl: 'http://hooks.slack.com/test' }, createdAt: new Date(),
    });

    await service.dispatch(testAlert, [slackChannel]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://hooks.slack.com/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('logs and swallows the error when a Slack call fails (non-ok response)', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'server error' });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const slackChannel = new NotificationChannel({
      id: 'c-1', name: 'Slack', type: ChannelType.SLACK,
      enabled: true, config: { webhookUrl: 'http://hooks.slack.com/test' }, createdAt: new Date(),
    });

    await expect(service.dispatch(testAlert, [slackChannel])).resolves.toBeUndefined();
  });

  it('uses the fallback Slack emoji and status branches for non-critical, non-firing alerts', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const slackChannel = new NotificationChannel({
      id: 'c-1', name: 'Slack', type: ChannelType.SLACK,
      enabled: true, config: { webhookUrl: 'http://hooks.slack.com/test' }, createdAt: new Date(),
    });

    await service.dispatch({ ...testAlert, severity: 'info', status: 'resolved' }, [slackChannel]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses default email recipients and status formatting when no channel overrides are provided', async () => {
    const service = new NotificationDispatcherService(makeConfig({ SMTP_HOST: 'smtp.example.com', ALERT_EMAIL_TO: 'default@example.com' }));
    const nodemailer = jest.requireMock('nodemailer') as { createTransport: jest.Mock };
    const sendMailMock = jest.fn().mockResolvedValue(undefined);
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

    const emailChannel = new NotificationChannel({
      id: 'c-1', name: 'Email', type: ChannelType.EMAIL,
      enabled: true, config: {}, createdAt: new Date(),
    });

    await service.dispatch({ ...testAlert, severity: 'warning', status: 'resolved' }, [emailChannel]);

    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      from: 'alerts@idp-platform.local',
      to: 'default@example.com',
      subject: '[WARNING] HighErrorRate is resolved',
    }));
  });

  it('sends a generic webhook notification for an enabled WEBHOOK channel', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const webhookChannel = new NotificationChannel({
      id: 'c-1', name: 'Generic Webhook', type: ChannelType.WEBHOOK,
      enabled: true, config: { url: 'http://example.com/hook' }, createdAt: new Date(),
    });

    await service.dispatch(testAlert, [webhookChannel]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://example.com/hook',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('logs and swallows the error when a webhook call fails (non-ok response)', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 502, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const webhookChannel = new NotificationChannel({
      id: 'c-1', name: 'Generic Webhook', type: ChannelType.WEBHOOK,
      enabled: true, config: { url: 'http://example.com/hook' }, createdAt: new Date(),
    });

    await expect(service.dispatch(testAlert, [webhookChannel])).resolves.toBeUndefined();
  });

  it('skips email sending when SMTP_HOST is not configured', async () => {
    const service = new NotificationDispatcherService(makeConfig());

    const emailChannel = new NotificationChannel({
      id: 'c-1', name: 'Email', type: ChannelType.EMAIL,
      enabled: true, config: { to: 'team@example.com' }, createdAt: new Date(),
    });

    await expect(service.dispatch(testAlert, [emailChannel])).resolves.toBeUndefined();
  });

  it('sends an email via nodemailer when SMTP_HOST is configured', async () => {
    const service = new NotificationDispatcherService(makeConfig({ SMTP_HOST: 'smtp.example.com' }));

    const emailChannel = new NotificationChannel({
      id: 'c-1', name: 'Email', type: ChannelType.EMAIL,
      enabled: true, config: { to: 'team@example.com', from: 'alerts@idp.local' }, createdAt: new Date(),
    });

    await expect(service.dispatch(testAlert, [emailChannel])).resolves.toBeUndefined();
  });

  it('dispatchToAll completes without error when no env vars set', async () => {
    const service = new NotificationDispatcherService(makeConfig());
    await expect(service.dispatchToAll(testAlert)).resolves.toBeUndefined();
  });

  it('dispatchToAll builds and dispatches to a Slack channel from SLACK_WEBHOOK_URL', async () => {
    const service = new NotificationDispatcherService(makeConfig({ SLACK_WEBHOOK_URL: 'http://hooks.slack.com/env' }));
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await service.dispatchToAll(testAlert);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://hooks.slack.com/env',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('dispatchToAll builds and dispatches to Discord and generic webhook channels from env', async () => {
    const service = new NotificationDispatcherService(makeConfig({
      DISCORD_WEBHOOK_URL: 'http://discord.example.com/hook',
      GENERIC_WEBHOOK_URL: 'http://generic.example.com/hook',
    }));
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await service.dispatchToAll(testAlert);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
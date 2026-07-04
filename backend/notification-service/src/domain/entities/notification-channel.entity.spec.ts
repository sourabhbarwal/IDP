import { NotificationChannel } from './notification-channel.entity';
import { ChannelType } from '../enums/channel-type.enum';

function makeChannel(overrides: Partial<ConstructorParameters<typeof NotificationChannel>[0]> = {}): NotificationChannel {
  return new NotificationChannel({
    id: 'c-1',
    name: 'Test Channel',
    type: ChannelType.SLACK,
    enabled: true,
    config: {},
    createdAt: new Date(),
    ...overrides,
  });
}

describe('NotificationChannel domain entity', () => {
  it('isSlack() returns true for SLACK type', () => {
    expect(makeChannel({ type: ChannelType.SLACK }).isSlack()).toBe(true);
  });

  it('isSlack() returns false for non-SLACK type', () => {
    expect(makeChannel({ type: ChannelType.EMAIL }).isSlack()).toBe(false);
  });

  it('isEmail() returns true for EMAIL type', () => {
    expect(makeChannel({ type: ChannelType.EMAIL }).isEmail()).toBe(true);
  });

  it('isEmail() returns false for non-EMAIL type', () => {
    expect(makeChannel({ type: ChannelType.WEBHOOK }).isEmail()).toBe(false);
  });

  it('isWebhook() returns true for WEBHOOK type', () => {
    expect(makeChannel({ type: ChannelType.WEBHOOK }).isWebhook()).toBe(true);
  });

  it('isWebhook() returns false for non-WEBHOOK type', () => {
    expect(makeChannel({ type: ChannelType.SLACK }).isWebhook()).toBe(false);
  });
});
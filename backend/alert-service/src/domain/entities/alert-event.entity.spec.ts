import { AlertEvent } from './alert-event.entity';
import { AlertSeverity } from '../enums/alert-severity.enum';
import { AlertStatus } from '../enums/alert-status.enum';

function makeEvent(overrides: Partial<ConstructorParameters<typeof AlertEvent>[0]> = {}): AlertEvent {
  return new AlertEvent({
    id: 'e-1', alertName: 'HighErrorRate', severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING, namespace: 'dev-auth-service', serviceId: 's-1',
    labels: {}, annotations: {},
    startsAt: new Date('2024-01-01T00:00:00Z'),
    endsAt: null, acknowledgedBy: null, acknowledgedAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });
}

describe('AlertEvent domain entity', () => {
  it('isFiring() returns true when status is FIRING', () => {
    expect(makeEvent({ status: AlertStatus.FIRING }).isFiring()).toBe(true);
  });

  it('isFiring() returns false when status is RESOLVED', () => {
    expect(makeEvent({ status: AlertStatus.RESOLVED }).isFiring()).toBe(false);
  });

  it('isAcknowledged() returns false when acknowledgedBy is null', () => {
    expect(makeEvent({ acknowledgedBy: null }).isAcknowledged()).toBe(false);
  });

  it('isAcknowledged() returns true when acknowledgedBy is set', () => {
    expect(makeEvent({ acknowledgedBy: 'u-1' }).isAcknowledged()).toBe(true);
  });

  it('durationMs() computes elapsed time correctly', () => {
    const event = makeEvent({
      startsAt: new Date('2024-01-01T00:00:00Z'),
      endsAt: new Date('2024-01-01T00:05:00Z'),
    });
    expect(event.durationMs()).toBe(300_000); // 5 minutes
  });

  it('durationMs() uses now as end when endsAt is null', () => {
    const event = makeEvent({ startsAt: new Date(Date.now() - 10_000), endsAt: null });
    expect(event.durationMs()).toBeGreaterThanOrEqual(10_000);
  });
});
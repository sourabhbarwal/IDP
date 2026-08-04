import { PlatformEvent } from './platform-event.entity';
import { EventType } from '../enums/event-type.enum';

function makeEvent(type: EventType, severity: 'info' | 'warning' | 'critical' = 'info'): PlatformEvent {
  return new PlatformEvent({
    id: 'e-1', type, severity,
    payload: { alertName: 'TestAlert' },
    serviceId: 's-1', serviceName: 'auth-service',
    timestamp: new Date(),
  });
}

describe('PlatformEvent', () => {
  it('isAlert() returns true for alert events', () => {
    expect(makeEvent(EventType.ALERT_FIRED).isAlert()).toBe(true);
    expect(makeEvent(EventType.ALERT_RESOLVED).isAlert()).toBe(true);
  });

  it('isAlert() returns false for deployment events', () => {
    expect(makeEvent(EventType.DEPLOYMENT_STARTED).isAlert()).toBe(false);
  });

  it('isDeployment() returns true for deployment events', () => {
    expect(makeEvent(EventType.DEPLOYMENT_SUCCEEDED).isDeployment()).toBe(true);
    expect(makeEvent(EventType.DEPLOYMENT_FAILED).isDeployment()).toBe(true);
  });

  it('isCritical() returns true only for critical severity', () => {
    expect(makeEvent(EventType.ALERT_FIRED, 'critical').isCritical()).toBe(true);
    expect(makeEvent(EventType.ALERT_FIRED, 'warning').isCritical()).toBe(false);
    expect(makeEvent(EventType.ALERT_FIRED, 'info').isCritical()).toBe(false);
  });

  it('toSocketPayload() returns serialisable object with ISO timestamp', () => {
    const event = makeEvent(EventType.ALERT_FIRED, 'critical');
    const payload = event.toSocketPayload();
    expect(payload['id']).toBe('e-1');
    expect(payload['type']).toBe(EventType.ALERT_FIRED);
    expect(payload['severity']).toBe('critical');
    expect(typeof payload['timestamp']).toBe('string');
    expect(payload['timestamp']).toContain('Z');
  });

  it('defaults severity to info when not provided', () => {
    const event = new PlatformEvent({
      id: 'e-2', type: EventType.AUDIT_EVENT,
      payload: {}, timestamp: new Date(),
    });
    expect(event.severity).toBe('info');
  });
});
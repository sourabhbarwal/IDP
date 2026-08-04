import { EventBroadcasterService } from './event-broadcaster.service';
import { PlatformEvent } from '../domain/entities/platform-event.entity';
import { EventType } from '../domain/enums/event-type.enum';

function makeEvent(type: EventType, severity: 'info' | 'warning' | 'critical' = 'info') {
  return new PlatformEvent({
    id: 'e-1', type, severity,
    payload: { test: true }, timestamp: new Date(),
  });
}

describe('EventBroadcasterService', () => {
  let service: EventBroadcasterService;
  let mockServer: {
    to: jest.Mock;
    emit: jest.Mock;
    sockets: { sockets: { size: number } };
  };
  let mockRoom: { emit: jest.Mock };

  beforeEach(() => {
    service = new EventBroadcasterService();
    mockRoom = { emit: jest.fn() };
    mockServer = {
      to: jest.fn().mockReturnValue(mockRoom),
      emit: jest.fn(),
      sockets: { sockets: { size: 5 } },
    };
    service.setServer(mockServer as never);
  });

  it('broadcasts alert events to alerts room', () => {
    service.broadcast(makeEvent(EventType.ALERT_FIRED));
    expect(mockServer.to).toHaveBeenCalledWith('alerts');
    expect(mockRoom.emit).toHaveBeenCalledWith(
      EventType.ALERT_FIRED,
      expect.objectContaining({ type: EventType.ALERT_FIRED }),
    );
  });

  it('broadcasts deployment events to deployments room', () => {
    service.broadcast(makeEvent(EventType.DEPLOYMENT_SUCCEEDED));
    expect(mockServer.to).toHaveBeenCalledWith('deployments');
  });

  it('emits critical events to ALL clients (server.emit)', () => {
    service.broadcast(makeEvent(EventType.ALERT_FIRED, 'critical'));
    expect(mockServer.emit).toHaveBeenCalledWith(
      'notification:critical',
      expect.objectContaining({ severity: 'critical' }),
    );
  });

  it('broadcasts to user room when userId is set', () => {
    const event = new PlatformEvent({
      id: 'e-1', type: EventType.ALERT_ACKNOWLEDGED,
      severity: 'info', payload: {}, userId: 'u-1', timestamp: new Date(),
    });
    service.broadcast(event);
    expect(mockServer.to).toHaveBeenCalledWith('user:u-1');
  });

  it('getConnectedCount() returns socket count', () => {
    expect(service.getConnectedCount()).toBe(5);
  });

  it('broadcast() is a no-op when no server is registered', () => {
    const noServerService = new EventBroadcasterService();
    expect(() =>
      noServerService.broadcast(makeEvent(EventType.ALERT_FIRED))
    ).not.toThrow();
  });
});
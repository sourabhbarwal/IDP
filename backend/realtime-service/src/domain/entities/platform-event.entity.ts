import { EventType } from '../enums/event-type.enum';

export interface PlatformEventProps {
  id: string;
  type: EventType;
  payload: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical';
  serviceId?: string;
  serviceName?: string;
  userId?: string;
  timestamp: Date;
}

/**
 * PlatformEvent — a real-time notification broadcast to connected clients.
 * Emitted by any IDP service via HTTP POST to realtime-service,
 * then forwarded to all relevant WebSocket subscribers.
 */
export class PlatformEvent {
  readonly id: string;
  readonly type: EventType;
  readonly payload: Record<string, unknown>;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly serviceId: string | undefined;
  readonly serviceName: string | undefined;
  readonly userId: string | undefined;
  readonly timestamp: Date;

  constructor(props: PlatformEventProps) {
    this.id          = props.id;
    this.type        = props.type;
    this.payload     = props.payload;
    this.severity    = props.severity ?? 'info';
    this.serviceId   = props.serviceId;
    this.serviceName = props.serviceName;
    this.userId      = props.userId;
    this.timestamp   = props.timestamp;
  }

  isAlert(): boolean {
    return this.type.startsWith('alert:');
  }

  isDeployment(): boolean {
    return this.type.startsWith('deployment:');
  }

  isCritical(): boolean {
    return this.severity === 'critical';
  }

  toSocketPayload(): Record<string, unknown> {
    return {
      id:          this.id,
      type:        this.type,
      severity:    this.severity,
      serviceId:   this.serviceId,
      serviceName: this.serviceName,
      payload:     this.payload,
      timestamp:   this.timestamp.toISOString(),
    };
  }
}
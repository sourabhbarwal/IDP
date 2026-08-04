import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PlatformEvent } from '../domain/entities/platform-event.entity';
import { EventType } from '../domain/enums/event-type.enum';

/**
 * EventBroadcaster — receives PlatformEvents and emits them
 * to the correct Socket.io rooms.
 *
 * Room strategy:
 *   'alerts'          — all connected clients (anyone can see alerts)
 *   'deployments'     — all connected clients
 *   'audit'           — all connected clients
 *   'user:{userId}'   — private events for a specific user
 */
@Injectable()
export class EventBroadcasterService {
  private readonly logger = new Logger(EventBroadcasterService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('Socket.io server registered with broadcaster');
  }

  broadcast(event: PlatformEvent): void {
    if (!this.server) {
      this.logger.warn('No Socket.io server — event not broadcast');
      return;
    }

    const payload = event.toSocketPayload();

    if (event.isAlert()) {
      this.server.to('alerts').emit(event.type, payload);
      this.logger.log(`Broadcast alert event: ${event.type} to room 'alerts'`);
    }

    if (event.isDeployment()) {
      this.server.to('deployments').emit(event.type, payload);
      this.logger.log(`Broadcast deployment event: ${event.type} to room 'deployments'`);
    }

    if (event.type === EventType.AUDIT_EVENT) {
      this.server.to('audit').emit(event.type, payload);
    }

    if (event.type === EventType.SERVICE_REGISTERED ||
        event.type === EventType.SERVICE_DELETED) {
      this.server.to('platform').emit(event.type, payload);
    }

    if (event.userId) {
      this.server.to(`user:${event.userId}`).emit(event.type, payload);
    }

    if (event.isCritical()) {
      this.server.emit('notification:critical', payload);
    }
  }

  getConnectedCount(): number {
    return this.server?.sockets?.sockets?.size ?? 0;
  }
}
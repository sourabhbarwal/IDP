import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { EventBroadcasterService } from '../../application/event-broadcaster.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
}

/**
 * Socket.io WebSocket Gateway.
 *
 * Connection flow:
 * 1. Client connects with JWT in auth.token
 * 2. Gateway validates JWT in handleConnection()
 * 3. On success: socket joins default rooms, emits 'connected' event
 * 4. On failure: socket is immediately disconnected
 *
 * Client-emitted events:
 * - 'subscribe' { room: 'alerts'|'deployments'|'audit'|'platform' }
 * - 'unsubscribe' { room: string }
 * - 'ping' — keepalive
 *
 * Server-emitted events:
 * - 'system:connected' — sent to client on successful connection
 * - 'alert:fired' | 'alert:resolved' | 'alert:acknowledged'
 * - 'deployment:started' | 'deployment:succeeded' | 'deployment:failed'
 * - 'notification:critical' — sent to ALL clients for critical alerts
 */
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost',
    ],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly broadcaster: EventBroadcasterService,
  ) {}

  afterInit(server: Server): void {
    this.broadcaster.setServer(server);
    this.logger.log('WebSocket Gateway initialised');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as { token?: string }).token ??
        (client.handshake.query['token'] as string | undefined);

      if (!token) {
        this.logger.warn(`Connection refused — no token (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        roles: string[];
      }>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
        issuer: this.config.get<string>('JWT_ISSUER', 'idp-platform'),
      });

      (client as AuthenticatedSocket).userId = payload.sub;
      (client as AuthenticatedSocket).email  = payload.email;

      await client.join(['alerts', 'deployments', 'platform']);
      await client.join(`user:${payload.sub}`);

      this.logger.log(
        `Client connected: ${payload.email} (${client.id}) — ` +
        `${this.broadcaster.getConnectedCount()} total`,
      );

      client.emit('system:connected', {
        socketId: client.id,
        userId:   payload.sub,
        email:    payload.email,
        rooms:    ['alerts', 'deployments', 'platform', `user:${payload.sub}`],
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      this.logger.warn(`Connection refused — ${message} (${client.id})`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const authClient = client as AuthenticatedSocket;
    this.logger.log(
      `Client disconnected: ${authClient.email ?? 'unknown'} (${client.id}) — ` +
      `${this.broadcaster.getConnectedCount()} total`,
    );
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ): Promise<{ success: boolean; room: string }> {
    const allowed = ['alerts', 'deployments', 'audit', 'platform'];
    if (!allowed.includes(data.room)) {
      throw new WsException(`Unknown room: ${data.room}`);
    }
    await client.join(data.room);
    this.logger.log(`${client.id} joined room: ${data.room}`);
    return { success: true, room: data.room };
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ): Promise<{ success: boolean; room: string }> {
    await client.leave(data.room);
    return { success: true, room: data.room };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() _client: Socket): { pong: boolean; timestamp: string } {
    return { pong: true, timestamp: new Date().toISOString() };
  }
}
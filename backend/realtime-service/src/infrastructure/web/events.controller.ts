import {
  Body, Controller, Get, HttpCode, HttpStatus, Post, Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '@idp/common';
import { PlatformEvent } from '../../domain/entities/platform-event.entity';
import { EventBroadcasterService } from '../../application/event-broadcaster.service';
import { PublishEventRequestDto } from './dto/publish-event-request.dto';

/**
 * Internal HTTP endpoint — other IDP services POST events here.
 * Protected by a static webhook token (not JWT) because callers
 * are backend services, not human users.
 */
@ApiTags('events')
@Controller('api/v1/events')
export class EventsController {
  constructor(
    private readonly broadcaster: EventBroadcasterService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a platform event (internal — used by other IDP services)',
  })
  publish(
    @Body() body: PublishEventRequestDto,
    @Req() req: Request,
  ): { broadcast: boolean; connections: number } {
    this.validateWebhookToken(req);

    const event = new PlatformEvent({
      id:          randomUUID(),
      type:        body.type,
      payload:     body.payload,
      severity:    body.severity,
      serviceId:   body.serviceId,
      serviceName: body.serviceName,
      userId:      body.userId,
      timestamp:   new Date(),
    });

    this.broadcaster.broadcast(event);

    return {
      broadcast:   true,
      connections: this.broadcaster.getConnectedCount(),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get WebSocket connection count' })
  status(): { connections: number; timestamp: string } {
    return {
      connections: this.broadcaster.getConnectedCount(),
      timestamp:   new Date().toISOString(),
    };
  }

  private validateWebhookToken(req: Request): void {
    const token = (req.headers['x-internal-token'] as string) ?? '';
    const expected = this.config.get<string>(
      'INTERNAL_WEBHOOK_TOKEN',
      '***REMOVED***',
    );
    if (token !== expected) {
      throw ApiException.unauthorized('Invalid internal webhook token');
    }
  }
}
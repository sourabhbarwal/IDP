import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventBroadcasterService } from '../application/event-broadcaster.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly broadcaster: EventBroadcasterService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return {
      status: 'UP',
      service: 'realtime-service',
      timestamp: new Date().toISOString(),
      connections: this.broadcaster.getConnectedCount(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  readiness() {
    return {
      status: 'READY',
      service: 'realtime-service',
      uptimeMs: Date.now() - this.startTime,
      connections: this.broadcaster.getConnectedCount(),
    };
  }
}
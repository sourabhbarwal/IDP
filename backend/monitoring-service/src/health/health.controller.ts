import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'UP', service: 'monitoring-service', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  readiness() {
    return { status: 'READY', service: 'monitoring-service', uptimeMs: Date.now() - this.startTime };
  }
}
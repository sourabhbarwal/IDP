import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'UP', service: 'logging-service', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  readiness() {
    return { status: 'READY', service: 'logging-service', uptimeMs: Date.now() - this.startTime };
  }
}
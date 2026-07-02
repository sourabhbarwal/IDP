import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { LokiQueryService } from '../../application/loki-query.service';

@ApiTags('logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/logs')
export class LogsController {
  constructor(private readonly lokiService: LokiQueryService) {}

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get recent logs for a specific service' })
  @ApiQuery({ name: 'environment', required: false, example: 'dev' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getServiceLogs(
    @Param('serviceName') serviceName: string,
    @Query('environment') environment?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lokiService.getServiceLogs(serviceName, environment ?? 'dev', Number(limit ?? 100));
  }

  @Get('search')
  @ApiOperation({ summary: 'Search logs across all services' })
  @ApiQuery({ name: 'q', description: 'Search query string' })
  @ApiQuery({ name: 'start', description: 'Start timestamp (ms)', required: false })
  @ApiQuery({ name: 'end', description: 'End timestamp (ms)', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') query: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const endMs = end ? Number(end) : Date.now();
    const startMs = start ? Number(start) : endMs - 3600_000;
    return this.lokiService.searchLogs(query, startMs, endMs, Number(limit ?? 100));
  }

  @Get('query')
  @ApiOperation({ summary: 'Execute a raw LogQL query' })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'namespace', required: false })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async query(
    @Query('service') service?: string,
    @Query('namespace') namespace?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const endMs = end ? Number(end) : Date.now();
    const startMs = start ? Number(start) : endMs - 3600_000;
    return this.lokiService.queryLogs({
      service, namespace, level, search, startMs, endMs, limit: Number(limit ?? 100),
    });
  }
}
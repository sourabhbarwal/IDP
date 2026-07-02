import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { PrometheusQueryService } from '../../application/prometheus-query.service';

@ApiTags('metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/metrics')
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusQueryService) {}

  @Get('services')
  @ApiOperation({ summary: 'Get metrics summary for all IDP Platform services' })
  async getAllServices() {
    return this.prometheusService.getAllServicesMetrics();
  }

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get metrics for a specific service' })
  async getServiceMetrics(
    @Param('serviceName') serviceName: string,
    @Query('namespace') namespace: string,
  ) {
    return this.prometheusService.getServiceMetrics(
      serviceName,
      namespace ?? `dev-${serviceName}`,
    );
  }

  @Get('query')
  @ApiOperation({ summary: 'Execute a raw PromQL instant query' })
  @ApiQuery({ name: 'q', description: 'PromQL expression' })
  async query(@Query('q') promql: string) {
    return this.prometheusService.queryInstant(promql);
  }

  @Get('query/range')
  @ApiOperation({ summary: 'Execute a raw PromQL range query' })
  @ApiQuery({ name: 'q', description: 'PromQL expression' })
  @ApiQuery({ name: 'start', description: 'Start timestamp (ms)' })
  @ApiQuery({ name: 'end', description: 'End timestamp (ms)' })
  @ApiQuery({ name: 'step', required: false })
  async queryRange(
    @Query('q') promql: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('step') step?: string,
  ) {
    return this.prometheusService.queryRange(promql, Number(start), Number(end), step);
  }
}
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { DoraMetricsService } from '../../application/dora-metrics.service';
import { DoraLevel } from '../../domain/enums/dora-level.enum';

@ApiTags('dora')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/dora')
export class DoraController {
  constructor(private readonly doraService: DoraMetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all 4 DORA metrics with performance classification' })
  @ApiQuery({ name: 'window', required: false, description: 'Days to look back (default 30)', type: Number })
  async getMetrics(@Query('window') window = 30) {
    const windowDays = Math.min(Math.max(Number(window) || 30, 1), 365);
    const metrics    = await this.doraService.compute(windowDays);
    const level      = metrics.classifyLevel();
    const perMetric  = metrics.classifyEachMetric();

    return {
      window: {
        days:      metrics.windowDays,
        startDate: new Date(Date.now() - metrics.windowDays * 86_400_000).toISOString().split('T')[0],
        endDate:   new Date().toISOString().split('T')[0],
      },
      overall: {
        level,
        description: this.levelDescription(level),
      },
      metrics: {
        deploymentFrequency: {
          value:       metrics.deploymentFrequencyPerDay,
          unit:        'deployments/day',
          level:       perMetric['deploymentFrequency'],
          total:       metrics.totalDeployments,
          description: this.deployFreqDescription(metrics.deploymentFrequencyPerDay),
        },
        leadTime: {
          value:       metrics.leadTimeHours,
          unit:        'hours',
          level:       perMetric['leadTime'],
          description: this.leadTimeDescription(metrics.leadTimeHours),
        },
        changeFailureRate: {
          value:        metrics.changeFailureRatePercent,
          unit:         '%',
          level:        perMetric['changeFailureRate'],
          totalFailed:  metrics.totalFailures,
          description:  this.cfrDescription(metrics.changeFailureRatePercent),
        },
        mttr: {
          value:          metrics.mttrHours,
          unit:           'hours',
          level:          perMetric['mttr'],
          totalIncidents: metrics.totalIncidents,
          description:    this.mttrDescription(metrics.mttrHours),
        },
      },
      trend: metrics.deploymentTrend,
    };
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get deployment frequency trend only (for charts)' })
  @ApiQuery({ name: 'window', required: false, type: Number })
  async getTrend(@Query('window') window = 30) {
    const windowDays = Math.min(Math.max(Number(window) || 30, 1), 365);
    const metrics    = await this.doraService.compute(windowDays);
    return {
      window: windowDays,
      trend:  metrics.deploymentTrend,
    };
  }

  @Get('summary')
  @SkipThrottle()
  @ApiOperation({ summary: 'Quick summary for dashboard header (level + key numbers)' })
  async getSummary() {
    const metrics = await this.doraService.compute(30);
    return {
      level:                     metrics.classifyLevel(),
      deploymentFrequencyPerDay: metrics.deploymentFrequencyPerDay,
      changeFailureRatePercent:  metrics.changeFailureRatePercent,
      mttrHours:                 metrics.mttrHours,
      totalDeployments30d:       metrics.totalDeployments,
    };
  }

  // ── Human-readable descriptions ──────────────────────────────────────────

  private levelDescription(level: DoraLevel): string {
    const map: Record<DoraLevel, string> = {
      ELITE:  'Elite performers — top 15% of organisations. Deploying multiple times per day with fast recovery.',
      HIGH:   'High performers — between weekly and daily deployments. Strong delivery capability.',
      MEDIUM: 'Medium performers — monthly to weekly deployments. Room to improve pipeline and testing.',
      LOW:    'Low performers — less than monthly deployments. Focus on automating the delivery pipeline.',
    };
    return map[level];
  }

  private deployFreqDescription(perDay: number): string {
    if (perDay >= 1)   return 'Multiple deployments per day';
    if (perDay >= 1/7) return 'Between once per day and once per week';
    if (perDay >= 1/30) return 'Between once per week and once per month';
    return 'Less than once per month';
  }

  private leadTimeDescription(hours: number): string {
    if (hours === 0)    return 'No completed deployments in window';
    if (hours < 1)      return 'Less than 1 hour';
    if (hours < 24)     return `${Math.round(hours)} hours`;
    if (hours < 168)    return `${Math.round(hours / 24)} days`;
    return `${Math.round(hours / 168)} weeks`;
  }

  private cfrDescription(pct: number): string {
    if (pct === 0)  return 'No failures in window';
    if (pct < 5)    return `${pct}% — excellent`;
    if (pct < 10)   return `${pct}% — good`;
    if (pct < 15)   return `${pct}% — needs improvement`;
    return `${pct}% — high failure rate`;
  }

  private mttrDescription(hours: number): string {
    if (hours === 0)   return 'No incidents resolved in window';
    if (hours < 1)     return `${Math.round(hours * 60)} minutes`;
    if (hours < 24)    return `${Math.round(hours)} hours`;
    if (hours < 168)   return `${Math.round(hours / 24)} days`;
    return `${Math.round(hours / 168)} weeks`;
  }
}
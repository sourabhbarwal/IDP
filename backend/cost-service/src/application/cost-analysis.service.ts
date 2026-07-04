import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceCost, RightsizingStatus } from '../domain/entities/service-cost.entity';
import { PriceModel } from '../domain/value-objects/price-model.value-object';

interface PrometheusScalar {
  resultType: string;
  result: Array<{ metric: Record<string, string>; value: [number, string] }>;
}

/**
 * Fetches Prometheus metrics and computes cost + rightsizing analysis
 * for each IDP Platform service.
 *
 * All Prometheus queries use docker-compose service DNS: http://prometheus:9090
 */
@Injectable()
export class CostAnalysisService {
  private readonly logger = new Logger(CostAnalysisService.name);
  private readonly prometheusUrl: string;
  private readonly priceModel: PriceModel;

  // Services to analyse — matches docker-compose service names
  private readonly services = [
    { name: 'auth-service', namespace: 'dev-auth-service' },
    { name: 'service-catalog-service', namespace: 'dev-service-catalog-service' },
    { name: 'repository-service', namespace: 'dev-repository-service' },
    { name: 'template-service', namespace: 'dev-template-service' },
    { name: 'deployment-service', namespace: 'dev-deployment-service' },
    { name: 'monitoring-service', namespace: 'dev-monitoring-service' },
    { name: 'logging-service', namespace: 'dev-logging-service' },
    { name: 'alert-service', namespace: 'dev-alert-service' },
    { name: 'notification-service', namespace: 'dev-notification-service' },
  ];

  constructor(private readonly config: ConfigService) {
    this.prometheusUrl = config.get<string>('PROMETHEUS_URL', 'http://prometheus:9090');
    this.priceModel = PriceModel.fromEnv();
  }

  async getAllServiceCosts(): Promise<ServiceCost[]> {
    const results = await Promise.allSettled(
      this.services.map((s) => this.getServiceCost(s.name, s.namespace)),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ServiceCost> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  async getServiceCost(serviceName: string, namespace: string): Promise<ServiceCost> {
    const [cpuUsage, memUsage, requestRate] = await Promise.all([
      this.queryCpuUsage(serviceName),
      this.queryMemoryUsage(serviceName),
      this.queryRequestRate(serviceName),
    ]);

    const hourlyCost = this.priceModel.computeHourlyCost(cpuUsage, memUsage);
    const monthlyCost = this.priceModel.computeMonthlyCost(cpuUsage, memUsage);

    const { status, recommendations, wastagePercent } = this.analyseRightsizing(
      cpuUsage, memUsage, requestRate,
    );

    return new ServiceCost({
      serviceName,
      namespace,
      usage: {
        cpuCores: Math.round(cpuUsage * 1000) / 1000,
        memoryMb: Math.round(memUsage),
        requestsPerMin: Math.round(requestRate * 60 * 100) / 100,
      },
      estimatedHourlyCostUsd: hourlyCost,
      estimatedMonthlyCostUsd: monthlyCost,
      rightsizingStatus: status,
      recommendations,
      wastagePercent,
      measuredAt: new Date(),
    });
  }

  async getPlatformTotals(): Promise<{
    totalMonthlyCostUsd: number;
    potentialSavingsUsd: number;
    idleServices: string[];
    oversizedServices: string[];
  }> {
    const costs = await this.getAllServiceCosts();

    const totalMonthlyCostUsd = costs.reduce((sum, c) => sum + c.estimatedMonthlyCostUsd, 0);
    const potentialSavingsUsd = costs.reduce((sum, c) => sum + c.monthlySavingsIfRightsized(), 0);
    const idleServices = costs.filter((c) => c.isIdle()).map((c) => c.serviceName);
    const oversizedServices = costs.filter((c) => c.isOversized()).map((c) => c.serviceName);

    return {
      totalMonthlyCostUsd: Math.round(totalMonthlyCostUsd * 100) / 100,
      potentialSavingsUsd: Math.round(potentialSavingsUsd * 100) / 100,
      idleServices,
      oversizedServices,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private analyseRightsizing(
    cpuCores: number,
    memoryMb: number,
    requestsPerSec: number,
  ): { status: RightsizingStatus; recommendations: string[]; wastagePercent: number } {
    const recommendations: string[] = [];
    let wastagePercent = 0;

    // Idle: near-zero traffic
    if (requestsPerSec < 1 / 60) {
      recommendations.push('Service has near-zero traffic. Consider scaling to zero or consolidating.');
      return { status: 'IDLE', recommendations, wastagePercent: 80 };
    }

    // Check CPU — oversized if using less than 25% of a single core but allocated more
    if (cpuCores < 0.05) {
      recommendations.push('CPU usage is very low. Consider reducing CPU requests to 50m.');
      wastagePercent = Math.max(wastagePercent, 60);
    } else if (cpuCores < 0.1) {
      recommendations.push('CPU usage is low. Current allocation appears sufficient.');
      wastagePercent = Math.max(wastagePercent, 30);
    }

    // Check memory — oversized if using less than 64MB
    if (memoryMb < 64) {
      recommendations.push('Memory usage is very low. Consider reducing memory limit to 128Mi.');
      wastagePercent = Math.max(wastagePercent, 50);
    } else if (memoryMb < 128) {
      recommendations.push('Memory usage is within expected range for a NestJS service.');
    }

    let status: RightsizingStatus = 'OPTIMAL';
    if (wastagePercent >= 50) {
      status = 'OVERSIZED';
    } else if (wastagePercent >= 20) {
      status = 'OPTIMAL';
    }

    if (recommendations.length === 0) {
      recommendations.push('Resource usage looks optimal for current traffic levels.');
    }

    return { status, recommendations, wastagePercent };
  }

  private async queryCpuUsage(serviceName: string): Promise<number> {
    // Average CPU cores used over 5 minutes by the service container
    const query = `avg(rate(process_cpu_seconds_total{job="${serviceName}"}[5m]))`;
    const result = await this.queryPrometheus(query);
    return this.extractScalarValue(result) ?? 0.05; // default 0.05 cores when no data
  }

  private async queryMemoryUsage(serviceName: string): Promise<number> {
    // Process memory in MB — uses Node.js default heap metrics from prom-client
    const query = `process_resident_memory_bytes{job="${serviceName}"} / 1024 / 1024`;
    const result = await this.queryPrometheus(query);
    return this.extractScalarValue(result) ?? 128; // default 128MB when no data
  }

  private async queryRequestRate(serviceName: string): Promise<number> {
    // Requests per second over the last 5 minutes
    const query = `sum(rate(http_requests_total{job="${serviceName}"}[5m]))`;
    const result = await this.queryPrometheus(query);
    return this.extractScalarValue(result) ?? 0;
  }

  private async queryPrometheus(promql: string): Promise<PrometheusScalar | null> {
    const url = `${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(promql)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const json = await response.json() as { status: string; data: PrometheusScalar };
      return json.status === 'success' ? json.data : null;
    } catch {
      return null;
    }
  }

  private extractScalarValue(data: PrometheusScalar | null): number | null {
    if (!data || data.result.length === 0) return null;
    const value = parseFloat(data.result[0].value[1]);
    return isNaN(value) ? null : value;
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceCost, RightsizingStatus } from '../domain/entities/service-cost.entity';
import { PriceModel } from '../domain/value-objects/price-model.value-object';

interface PrometheusResult {
  resultType: string;
  result: Array<{ metric: Record<string, string>; value: [number, string] }>;
}

@Injectable()
export class CostAnalysisService {
  private readonly logger = new Logger(CostAnalysisService.name);
  private readonly prometheusUrl: string;
  private readonly priceModel: PriceModel;

  private readonly services = [
    { name: 'auth-service',             container: 'idp-auth-service' },
    { name: 'service-catalog-service',  container: 'idp-service-catalog-service' },
    { name: 'repository-service',       container: 'idp-repository-service' },
    { name: 'template-service',         container: 'idp-template-service' },
    { name: 'deployment-service',       container: 'idp-deployment-service' },
    { name: 'monitoring-service',       container: 'idp-monitoring-service' },
    { name: 'logging-service',          container: 'idp-logging-service' },
    { name: 'alert-service',            container: 'idp-alert-service' },
    { name: 'notification-service',     container: 'idp-notification-service' },
    { name: 'audit-service',            container: 'idp-audit-service' },
    { name: 'cost-service',             container: 'idp-cost-service' },
    { name: 'ai-copilot-service',       container: 'idp-ai-copilot-service' },
  ];

  constructor(private readonly config: ConfigService) {
    this.prometheusUrl = config.get<string>('PROMETHEUS_URL', 'http://prometheus:9090');
    this.priceModel = PriceModel.fromEnv();
  }

  async getAllServiceCosts(): Promise<ServiceCost[]> {
    const results = await Promise.allSettled(
      this.services.map((s) => this.getServiceCost(s.name, `dev-${s.name}`, s.container)),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ServiceCost> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  async getServiceCost(
    serviceName: string,
    namespace: string,
    containerName?: string,
  ): Promise<ServiceCost> {
    const container = containerName ??
      this.services.find((s) => s.name === serviceName)?.container ??
      `idp-${serviceName}`;

    const [cpuUsage, memUsage, requestRate] = await Promise.all([
      this.queryCpuUsage(container),
      this.queryMemoryUsage(container),
      this.queryRequestRate(serviceName),
    ]);

    const hourlyCost   = this.priceModel.computeHourlyCost(cpuUsage, memUsage);
    const monthlyCost  = this.priceModel.computeMonthlyCost(cpuUsage, memUsage);

    const { status, recommendations, wastagePercent } =
      this.analyseRightsizing(cpuUsage, memUsage, requestRate);

    return new ServiceCost({
      serviceName,
      namespace,
      usage: {
        cpuCores:       Math.round(cpuUsage * 1000) / 1000,
        memoryMb:       Math.round(memUsage),
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

  async getPlatformTotals() {
    const costs = await this.getAllServiceCosts();

    return {
      totalMonthlyCostUsd:  Math.round(costs.reduce((s, c) => s + c.estimatedMonthlyCostUsd, 0) * 100) / 100,
      potentialSavingsUsd:  Math.round(costs.reduce((s, c) => s + c.monthlySavingsIfRightsized(), 0) * 100) / 100,
      idleServices:         costs.filter((c) => c.isIdle()).map((c) => c.serviceName),
      oversizedServices:    costs.filter((c) => c.isOversized()).map((c) => c.serviceName),
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

    if (requestsPerSec < 1 / 60) {
      recommendations.push('Service has near-zero traffic. Consider scaling to zero or consolidating with another service.');
      return { status: 'IDLE', recommendations, wastagePercent: 80 };
    }

    if (cpuCores < 0.01) {
      recommendations.push(`CPU usage is very low (${(cpuCores * 1000).toFixed(1)}m cores). Reduce CPU request to 50m to free scheduler headroom.`);
      wastagePercent = Math.max(wastagePercent, 70);
    } else if (cpuCores < 0.05) {
      recommendations.push(`CPU usage is low (${(cpuCores * 1000).toFixed(1)}m cores). Current allocation is adequate.`);
      wastagePercent = Math.max(wastagePercent, 30);
    }

    if (memoryMb < 50) {
      recommendations.push(`Memory usage is very low (${Math.round(memoryMb)}MB). Consider reducing memory limit to 128Mi.`);
      wastagePercent = Math.max(wastagePercent, 60);
    } else if (memoryMb < 100) {
      recommendations.push(`Memory usage is normal for a NestJS service (${Math.round(memoryMb)}MB). No change needed.`);
    } else if (memoryMb > 400) {
      recommendations.push(`Memory usage is high (${Math.round(memoryMb)}MB). Check for memory leaks — should be <256MB for a typical NestJS service.`);
    }

    let status: RightsizingStatus = 'OPTIMAL';
    if (wastagePercent >= 60) {
      status = 'OVERSIZED';
    } else if (wastagePercent >= 20) {
      status = 'OPTIMAL';
    }

    if (recommendations.length === 0) {
      recommendations.push(`Resource usage is optimal. CPU: ${(cpuCores * 1000).toFixed(1)}m, Memory: ${Math.round(memoryMb)}MB, Requests: ${(requestsPerSec * 60).toFixed(1)}/min.`);
    }

    return { status, recommendations, wastagePercent };
  }

  /**
   * Real CPU usage from cAdvisor via Prometheus.
   * cAdvisor exposes container_cpu_usage_seconds_total.
   * Rate over 2 minutes gives average CPU cores used.
   */
  private async queryCpuUsage(containerName: string): Promise<number> {
    // Try cAdvisor metric first (real data)
    const cAdvisorQuery = `rate(container_cpu_usage_seconds_total{name="${containerName}",container!="POD"}[2m])`;
    const cAdvisorResult = await this.queryPrometheus(cAdvisorQuery);
    const cAdvisorValue = this.extractScalarValue(cAdvisorResult);
    if (cAdvisorValue !== null) {
      this.logger.debug(`cAdvisor CPU for ${containerName}: ${cAdvisorValue} cores`);
      return cAdvisorValue;
    }

    // Fallback to process metrics from NestJS /metrics endpoint
    const serviceName = containerName.replace(/^idp-/, '');
    const processQuery = `avg(rate(process_cpu_seconds_total{job="${serviceName}"}[2m]))`;
    const processResult = await this.queryPrometheus(processQuery);
    return this.extractScalarValue(processResult) ?? 0.05;
  }

  /**
   * Real memory usage from cAdvisor via Prometheus.
   * container_memory_working_set_bytes is the most accurate metric
   * (excludes reclaimable cache, matches what OOM killer sees).
   */
  private async queryMemoryUsage(containerName: string): Promise<number> {
    // Try cAdvisor metric first (real data — working set in MB)
    const cAdvisorQuery = `container_memory_working_set_bytes{name="${containerName}",container!="POD"} / 1024 / 1024`;
    const cAdvisorResult = await this.queryPrometheus(cAdvisorQuery);
    const cAdvisorValue = this.extractScalarValue(cAdvisorResult);
    if (cAdvisorValue !== null) {
      this.logger.debug(`cAdvisor Memory for ${containerName}: ${cAdvisorValue}MB`);
      return cAdvisorValue;
    }

    // Fallback to Node.js process resident memory
    const serviceName = containerName.replace(/^idp-/, '');
    const processQuery = `process_resident_memory_bytes{job="${serviceName}"} / 1024 / 1024`;
    const processResult = await this.queryPrometheus(processQuery);
    return this.extractScalarValue(processResult) ?? 128;
  }

  private async queryRequestRate(serviceName: string): Promise<number> {
    const query = `sum(rate(http_requests_total{job="${serviceName}"}[5m]))`;
    const result = await this.queryPrometheus(query);
    return this.extractScalarValue(result) ?? 0;
  }

  private async queryPrometheus(promql: string): Promise<PrometheusResult | null> {
    const url = `${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(promql)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const json = await response.json() as { status: string; data: PrometheusResult };
      return json.status === 'success' ? json.data : null;
    } catch {
      return null;
    }
  }

  private extractScalarValue(data: PrometheusResult | null): number | null {
    if (!data || data.result.length === 0) return null;
    const value = parseFloat(data.result[0].value[1]);
    return isNaN(value) ? null : value;
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetricResult {
  metric: Record<string, string>;
  value: [number, string]; // [timestamp, value]
}

export interface RangeResult {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

export interface PrometheusQueryResponse {
  resultType: 'vector' | 'matrix' | 'scalar';
  result: MetricResult[] | RangeResult[];
}

export interface ServiceMetrics {
  service: string;
  namespace: string;
  requestRate: number;
  errorRate: number;
  p95LatencyMs: number;
  memoryUsageBytes: number;
  cpuUsageCores: number;
  readyReplicas: number;
}

/**
 * Queries Prometheus for IDP Platform service metrics.
 * Wraps PromQL queries in a service-aware API so the frontend
 * never needs to know PromQL syntax.
 */
@Injectable()
export class PrometheusQueryService {
  private readonly logger = new Logger(PrometheusQueryService.name);
  private readonly prometheusUrl: string;

  constructor(private readonly config: ConfigService) {
    this.prometheusUrl = config.get<string>('PROMETHEUS_URL', 'http://prometheus:9090');
  }

  async queryInstant(promql: string): Promise<PrometheusQueryResponse> {
    const url = `${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(promql)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Prometheus returned ${response.status}: ${await response.text()}`);
      }
      const json = await response.json() as { status: string; data: PrometheusQueryResponse };
      if (json.status !== 'success') {
        throw new Error(`Prometheus query failed: ${JSON.stringify(json)}`);
      }
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Prometheus query failed: ${message}`);
      throw new Error(`Failed to query Prometheus: ${message}`);
    }
  }

  async queryRange(
    promql: string,
    startMs: number,
    endMs: number,
    step = '60s',
  ): Promise<PrometheusQueryResponse> {
    const params = new URLSearchParams({
      query: promql,
      start: (startMs / 1000).toString(),
      end: (endMs / 1000).toString(),
      step,
    });

    const url = `${this.prometheusUrl}/api/v1/query_range?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Prometheus returned ${response.status}`);
      }
      const json = await response.json() as { status: string; data: PrometheusQueryResponse };
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Prometheus range query failed: ${message}`);
      throw new Error(`Failed to query Prometheus: ${message}`);
    }
  }

  async getServiceMetrics(serviceName: string, namespace: string): Promise<ServiceMetrics> {
    const [requestRate, errorRate, p95Latency] = await Promise.allSettled([
      this.queryInstant(`sum(rate(http_request_duration_ms_count{kubernetes_namespace="${namespace}"}[5m]))`),
      this.queryInstant(
        `sum(rate(http_request_duration_ms_count{kubernetes_namespace="${namespace}",status=~"5.."}[5m])) / sum(rate(http_request_duration_ms_count{kubernetes_namespace="${namespace}"}[5m]))`,
      ),
      this.queryInstant(
        `histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket{kubernetes_namespace="${namespace}"}[5m])) by (le))`,
      ),
    ]);

    const extractValue = (result: PromiseSettledResult<PrometheusQueryResponse>): number => {
      if (result.status === 'rejected') return 0;
      const data = result.value;
      if (data.resultType === 'vector' && data.result.length > 0) {
        const r = data.result[0] as MetricResult;
        return parseFloat(r.value[1]) || 0;
      }
      return 0;
    };

    return {
      service: serviceName,
      namespace,
      requestRate: extractValue(requestRate),
      errorRate: extractValue(errorRate),
      p95LatencyMs: extractValue(p95Latency),
      memoryUsageBytes: 0, // Populated by kube-state-metrics in full deployment
      cpuUsageCores: 0,
      readyReplicas: 0,
    };
  }

  async getAllServicesMetrics(): Promise<ServiceMetrics[]> {
    const services = [
      { name: 'auth-service', namespace: 'dev-auth-service' },
      { name: 'service-catalog-service', namespace: 'dev-service-catalog-service' },
      { name: 'repository-service', namespace: 'dev-repository-service' },
      { name: 'template-service', namespace: 'dev-template-service' },
      { name: 'deployment-service', namespace: 'dev-deployment-service' },
    ];

    const results = await Promise.allSettled(
      services.map((s) => this.getServiceMetrics(s.name, s.namespace)),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ServiceMetrics> => r.status === 'fulfilled')
      .map((r) => r.value);
  }
}
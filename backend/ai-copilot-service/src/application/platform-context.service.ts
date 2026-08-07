import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CircuitBreakerRegistry,
  CircuitBreaker,
  resilientFetch,
  CircuitOpenError,
} from '@idp/common';

export interface PlatformContext {
  activeAlerts: unknown[];
  costSummary: unknown | null;
  servicesMetrics: unknown[];
  sources: string[];
}

@Injectable()
export class PlatformContextService implements OnModuleInit {
  private readonly logger = new Logger(PlatformContextService.name);

  private readonly alertServiceUrl: string;
  private readonly costServiceUrl: string;
  private readonly monitoringServiceUrl: string;

  // One circuit breaker per downstream service
  private cbAlert!: CircuitBreaker;
  private cbCost!: CircuitBreaker;
  private cbMonitoring!: CircuitBreaker;

  constructor(
    private readonly config: ConfigService,
    private readonly cbRegistry: CircuitBreakerRegistry,
  ) {
    this.alertServiceUrl     = config.get<string>('ALERT_SERVICE_URL',      'http://alert-service:3008');
    this.costServiceUrl      = config.get<string>('COST_SERVICE_URL',       'http://cost-service:3011');
    this.monitoringServiceUrl = config.get<string>('MONITORING_SERVICE_URL', 'http://monitoring-service:3006');
  }

  onModuleInit(): void {
    // Create circuit breakers — shared across all requests
    this.cbAlert     = this.cbRegistry.getOrCreate('alert-service',      5, 30_000);
    this.cbCost      = this.cbRegistry.getOrCreate('cost-service',       5, 30_000);
    this.cbMonitoring = this.cbRegistry.getOrCreate('monitoring-service', 5, 30_000);
  }

  async gatherFullContext(bearerToken: string): Promise<PlatformContext> {
    const sources: string[] = [];

    const [alerts, cost, metrics] = await Promise.allSettled([
      this.fetchActiveAlerts(bearerToken),
      this.fetchCostSummary(bearerToken),
      this.fetchServicesMetrics(bearerToken),
    ]);

    const activeAlerts = alerts.status === 'fulfilled' ? alerts.value : [];
    if (alerts.status === 'fulfilled') sources.push('alert-service');
    else this.logger.warn(`Alert context unavailable: ${(alerts as PromiseRejectedResult).reason}`);

    const costSummary = cost.status === 'fulfilled' ? cost.value : null;
    if (cost.status === 'fulfilled') sources.push('cost-service');
    else this.logger.warn(`Cost context unavailable: ${(cost as PromiseRejectedResult).reason}`);

    const servicesMetrics = metrics.status === 'fulfilled' ? metrics.value : [];
    if (metrics.status === 'fulfilled') sources.push('monitoring-service');
    else this.logger.warn(`Metrics context unavailable: ${(metrics as PromiseRejectedResult).reason}`);

    return { activeAlerts, costSummary, servicesMetrics, sources };
  }

  async gatherAlertContext(bearerToken: string): Promise<{ alerts: unknown[]; sources: string[] }> {
    try {
      const alerts = await this.fetchActiveAlerts(bearerToken);
      return { alerts, sources: ['alert-service'] };
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        this.logger.warn(`Alert service circuit OPEN: ${err.message}`);
      }
      return { alerts: [], sources: [] };
    }
  }

  async gatherCostContext(
    bearerToken: string,
  ): Promise<{ cost: unknown | null; services: unknown[]; sources: string[] }> {
    const [summary, services] = await Promise.allSettled([
      this.fetchCostSummary(bearerToken),
      this.fetchServiceCosts(bearerToken),
    ]);

    const sources: string[] = [];
    if (summary.status === 'fulfilled')  sources.push('cost-service (summary)');
    if (services.status === 'fulfilled') sources.push('cost-service (per-service)');

    return {
      cost:     summary.status  === 'fulfilled' ? summary.value   : null,
      services: services.status === 'fulfilled' ? services.value  : [],
      sources,
    };
  }

  // ── Private fetch helpers with full resilience ────────────────────────────

  private async fetchActiveAlerts(token: string): Promise<unknown[]> {
    const res = await resilientFetch(
      `${this.alertServiceUrl}/api/v1/alerts/active`,
      { headers: { Authorization: `Bearer ${token}` } },
      { timeoutMs: 5_000, maxAttempts: 2, circuit: this.cbAlert },
    );
    if (!res.ok) throw new Error(`Alert service returned ${res.status}`);
    return res.json() as Promise<unknown[]>;
  }

  private async fetchCostSummary(token: string): Promise<unknown> {
    const res = await resilientFetch(
      `${this.costServiceUrl}/api/v1/cost/summary`,
      { headers: { Authorization: `Bearer ${token}` } },
      { timeoutMs: 8_000, maxAttempts: 2, circuit: this.cbCost },
    );
    if (!res.ok) throw new Error(`Cost service returned ${res.status}`);
    return res.json();
  }

  private async fetchServiceCosts(token: string): Promise<unknown[]> {
    const res = await resilientFetch(
      `${this.costServiceUrl}/api/v1/cost/services`,
      { headers: { Authorization: `Bearer ${token}` } },
      { timeoutMs: 10_000, maxAttempts: 2, circuit: this.cbCost },
    );
    if (!res.ok) throw new Error(`Cost service returned ${res.status}`);
    return res.json() as Promise<unknown[]>;
  }

  private async fetchServicesMetrics(token: string): Promise<unknown[]> {
    const res = await resilientFetch(
      `${this.monitoringServiceUrl}/api/v1/metrics/services`,
      { headers: { Authorization: `Bearer ${token}` } },
      { timeoutMs: 5_000, maxAttempts: 2, circuit: this.cbMonitoring },
    );
    if (!res.ok) throw new Error(`Monitoring service returned ${res.status}`);
    return res.json() as Promise<unknown[]>;
  }
}
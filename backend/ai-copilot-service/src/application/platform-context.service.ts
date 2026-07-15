import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PlatformContext {
  activeAlerts: unknown[];
  costSummary: unknown | null;
  servicesMetrics: unknown[];
  sources: string[];
}

/**
 * Fetches live platform data from other IDP services to provide
 * as context to the AI model. Uses docker-compose service DNS.
 *
 * A JWT token from the requesting user is forwarded so each
 * internal call is authenticated (service-to-service with user token).
 */
@Injectable()
export class PlatformContextService {
  private readonly logger = new Logger(PlatformContextService.name);

  private readonly alertServiceUrl: string;
  private readonly costServiceUrl: string;
  private readonly monitoringServiceUrl: string;

  constructor(private readonly config: ConfigService) {
    this.alertServiceUrl = config.get<string>('ALERT_SERVICE_URL', 'http://alert-service:3008');
    this.costServiceUrl = config.get<string>('COST_SERVICE_URL', 'http://cost-service:3011');
    this.monitoringServiceUrl = config.get<string>('MONITORING_SERVICE_URL', 'http://monitoring-service:3006');
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

    const costSummary = cost.status === 'fulfilled' ? cost.value : null;
    if (cost.status === 'fulfilled') sources.push('cost-service');

    const servicesMetrics = metrics.status === 'fulfilled' ? metrics.value : [];
    if (metrics.status === 'fulfilled') sources.push('monitoring-service');

    return { activeAlerts, costSummary, servicesMetrics, sources };
  }

  async gatherAlertContext(bearerToken: string): Promise<{ alerts: unknown[]; sources: string[] }> {
    try {
      const alerts = await this.fetchActiveAlerts(bearerToken);
      return { alerts, sources: ['alert-service'] };
    } catch {
      return { alerts: [], sources: [] };
    }
  }

  async gatherCostContext(bearerToken: string): Promise<{ cost: unknown | null; services: unknown[]; sources: string[] }> {
    const [summary, services] = await Promise.allSettled([
      this.fetchCostSummary(bearerToken),
      this.fetchServiceCosts(bearerToken),
    ]);

    const sources: string[] = [];
    if (summary.status === 'fulfilled') sources.push('cost-service (summary)');
    if (services.status === 'fulfilled') sources.push('cost-service (per-service)');

    return {
      cost: summary.status === 'fulfilled' ? summary.value : null,
      services: services.status === 'fulfilled' ? services.value : [],
      sources,
    };
  }

  private async fetchActiveAlerts(token: string): Promise<unknown[]> {
    const res = await fetch(`${this.alertServiceUrl}/api/v1/alerts/active`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Alert service returned ${res.status}`);
    return res.json() as Promise<unknown[]>;
  }

  private async fetchCostSummary(token: string): Promise<unknown> {
    const res = await fetch(`${this.costServiceUrl}/api/v1/cost/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Cost service returned ${res.status}`);
    return res.json();
  }

  private async fetchServiceCosts(token: string): Promise<unknown[]> {
    const res = await fetch(`${this.costServiceUrl}/api/v1/cost/services`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Cost service returned ${res.status}`);
    return res.json() as Promise<unknown[]>;
  }

  private async fetchServicesMetrics(token: string): Promise<unknown[]> {
    const res = await fetch(`${this.monitoringServiceUrl}/api/v1/metrics/services`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Monitoring service returned ${res.status}`);
    return res.json() as Promise<unknown[]>;
  }
}    
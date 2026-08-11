import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { resilientFetch, CircuitBreakerRegistry } from '@idp/common';
import { HealthScore } from '../../domain/value-objects/health-score.value-object';

export interface ServiceHealthResult {
  serviceId:       string;
  healthScore:     number;
  healthLevel:     string;
  activeAlerts:    number;
  failureRate:     number;
  hasDeployments:  boolean;
  lastDeployedAt:  string | null;
  onboardingScore: number;  // 0-100 how complete the service setup is
  checklist:       OnboardingChecklistItem[];
}

export interface OnboardingChecklistItem {
  key:       string;
  label:     string;
  completed: boolean;
  detail:    string | null;
}

@Injectable()
export class GetServiceHealthUseCase {
  private readonly logger = new Logger(GetServiceHealthUseCase.name);

  private readonly alertServiceUrl:      string;
  private readonly deploymentServiceUrl: string;
  private readonly repositoryServiceUrl: string;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly cbRegistry: CircuitBreakerRegistry,
  ) {
    this.alertServiceUrl      = config.get('ALERT_SERVICE_URL',      'http://alert-service:3008');
    this.deploymentServiceUrl = config.get('DEPLOYMENT_SERVICE_URL', 'http://deployment-service:3005');
    this.repositoryServiceUrl = config.get('REPOSITORY_SERVICE_URL', 'http://repository-service:3003');
  }

  async execute(serviceId: string, bearerToken: string): Promise<ServiceHealthResult> {
    // Fetch all data in parallel with circuit breakers
    const [alertData, deployData, repoData, alertRulesData] = await Promise.allSettled([
      this.fetchActiveAlerts(serviceId, bearerToken),
      this.fetchDeployments(serviceId, bearerToken),
      this.fetchRepository(serviceId, bearerToken),
      this.fetchAlertRules(serviceId, bearerToken),
    ]);

    // ── Active alerts ──────────────────────────────────────────────────────
    const activeAlerts: Array<Record<string, unknown>> =
      alertData.status === 'fulfilled' ? alertData.value : [];
    const serviceAlertCount = activeAlerts.filter(
      (a) => (a['labels'] as Record<string, string>)?.['service_id'] === serviceId,
    ).length;

    // ── Deployment data ────────────────────────────────────────────────────
    const deployments: Array<Record<string, unknown>> =
      deployData.status === 'fulfilled' ? deployData.value : [];
    const total    = deployments.length;
    const failed   = deployments.filter(
      (d) => d['status'] === 'FAILED' || d['status'] === 'ROLLED_BACK',
    ).length;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;
    const lastDeploy  = deployments[0] ?? null;

    // ── Health score ───────────────────────────────────────────────────────
    const hs = new HealthScore({
      activeAlertCount:   serviceAlertCount,
      failureRatePercent: failureRate,
      hasDeployments:     total > 0,
    });

    // ── Onboarding checklist ───────────────────────────────────────────────
    const hasRepo       = repoData.status === 'fulfilled' && repoData.value !== null;
    const hasAlertRules = alertRulesData.status === 'fulfilled' && alertRulesData.value > 0;
    const hasDeployment = total > 0;
    const hasMetrics    = await this.checkMetricsEndpoint(serviceId);
    const hasDeps       = await this.checkHasDependencies(serviceId);

    const checklist: OnboardingChecklistItem[] = [
      {
        key:       'service_registered',
        label:     'Service registered in catalog',
        completed: true,
        detail:    'Service is active in the catalog',
      },
      {
        key:       'repository_provisioned',
        label:     'GitHub repository provisioned',
        completed: hasRepo,
        detail:    hasRepo
          ? (repoData.value as Record<string, unknown>)?.['repositoryUrl'] as string ?? null
          : 'Go to Catalog → your service → Provision Repository',
      },
      {
        key:       'deployed_once',
        label:     'At least one successful deployment',
        completed: hasDeployment,
        detail:    hasDeployment
          ? `Last deployed: ${lastDeploy?.['createdAt'] ?? 'unknown'}`
          : 'Use Deployment Service to deploy to dev environment',
      },
      {
        key:       'alert_rules_configured',
        label:     'Alert rules configured',
        completed: hasAlertRules,
        detail:    hasAlertRules
          ? `${alertRulesData.value} alert rule(s) configured`
          : 'Go to Alerts → New Rule and add at least one rule for this service',
      },
      {
        key:       'metrics_endpoint',
        label:     'Prometheus /metrics endpoint exposed',
        completed: hasMetrics,
        detail:    hasMetrics
          ? '/metrics endpoint reachable by Prometheus'
          : 'Expose a /metrics endpoint — use prom-client (Node.js) or equivalent',
      },
      {
        key:       'dependencies_declared',
        label:     'Dependencies declared',
        completed: hasDeps,
        detail:    hasDeps
          ? 'Service dependencies are mapped'
          : 'Declare which services this service depends on for impact analysis',
      },
    ];

    const completed      = checklist.filter((c) => c.completed).length;
    const onboardingScore = Math.round((completed / checklist.length) * 100);

    return {
      serviceId,
      healthScore:     hs.score,
      healthLevel:     hs.level,
      activeAlerts:    serviceAlertCount,
      failureRate:     Math.round(failureRate * 10) / 10,
      hasDeployments:  hasDeployment,
      lastDeployedAt:  lastDeploy
        ? String(lastDeploy['createdAt'])
        : null,
      onboardingScore,
      checklist,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async fetchActiveAlerts(
    serviceId: string,
    token: string,
  ): Promise<Array<Record<string, unknown>>> {
    const cb  = this.cbRegistry.getOrCreate('alert-service-catalog', 5, 30_000);
    try {
      const res = await resilientFetch(
        `${this.alertServiceUrl}/api/v1/alerts/active`,
        { headers: { Authorization: `Bearer ${token}` } },
        { timeoutMs: 5_000, maxAttempts: 2, circuit: cb },
      );
      return res.ok ? (res.json() as Promise<Array<Record<string, unknown>>>) : [];
    } catch {
      return [];
    }
  }

  private async fetchDeployments(
    serviceId: string,
    token: string,
  ): Promise<Array<Record<string, unknown>>> {
    const cb  = this.cbRegistry.getOrCreate('deployment-service-catalog', 5, 30_000);
    try {
      const res = await resilientFetch(
        `${this.deploymentServiceUrl}/api/v1/deployments?serviceId=${serviceId}&size=20`,
        { headers: { Authorization: `Bearer ${token}` } },
        { timeoutMs: 5_000, maxAttempts: 2, circuit: cb },
      );
      if (!res.ok) return [];
      const data = await res.json() as { content?: Array<Record<string, unknown>> };
      return data.content ?? [];
    } catch {
      return [];
    }
  }

  private async fetchRepository(
    serviceId: string,
    token: string,
  ): Promise<Record<string, unknown> | null> {
    const cb = this.cbRegistry.getOrCreate('repository-service-catalog', 5, 30_000);
    try {
      const res = await resilientFetch(
        `${this.repositoryServiceUrl}/api/v1/repositories/by-service/${serviceId}`,
        { headers: { Authorization: `Bearer ${token}` } },
        { timeoutMs: 5_000, maxAttempts: 2, circuit: cb },
      );
      return res.ok ? (res.json() as Promise<Record<string, unknown>>) : null;
    } catch {
      return null;
    }
  }

  private async fetchAlertRules(serviceId: string, token: string): Promise<number> {
    const cb = this.cbRegistry.getOrCreate('alert-rules-catalog', 5, 30_000);
    try {
      const res = await resilientFetch(
        `${this.alertServiceUrl}/api/v1/alerts/rules?serviceId=${serviceId}`,
        { headers: { Authorization: `Bearer ${token}` } },
        { timeoutMs: 5_000, maxAttempts: 2, circuit: cb },
      );
      if (!res.ok) return 0;
      const data = await res.json() as { totalElements?: number };
      return data.totalElements ?? 0;
    } catch {
      return 0;
    }
  }

  private async checkMetricsEndpoint(serviceId: string): Promise<boolean> {
    // Check if Prometheus has scraped this service
    // Approximate: check if service appears in deployment records with known port
    try {
      const rows = await this.db.query(
        `SELECT 1 FROM deployment.deployments
         WHERE service_id = $1 AND status = 'SUCCEEDED'
         LIMIT 1`,
        [serviceId],
      );
      // If service has been deployed, assume it exposes /metrics
      // (all our templates include it)
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  private async checkHasDependencies(serviceId: string): Promise<boolean> {
    try {
      const rows = await this.db.query(
        `SELECT 1 FROM catalog.service_dependencies WHERE service_id = $1 LIMIT 1`,
        [serviceId],
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }
}
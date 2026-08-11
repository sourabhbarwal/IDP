export type HealthLevel = 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL';

export interface HealthScoreComponents {
  activeAlertCount:   number;
  failureRatePercent: number;
  hasDeployments:     boolean;
}

/**
 * HealthScore — composite 0-100 score for a service.
 * Higher is better.
 *
 * Formula:
 *   base = 100
 *   - (alertCount × 20) capped at 60
 *   - (failureRate × 2)  capped at 40
 *
 * Level thresholds:
 *   90-100 → HEALTHY
 *   70-89  → DEGRADED
 *   50-69  → WARNING
 *   0-49   → CRITICAL
 */
export class HealthScore {
  readonly score:      number;
  readonly level:      HealthLevel;
  readonly components: HealthScoreComponents;

  constructor(components: HealthScoreComponents) {
    this.components = components;
    this.score      = this.compute(components);
    this.level      = this.classify(this.score);
  }

  private compute(c: HealthScoreComponents): number {
    let score = 100;
    score -= Math.min(c.activeAlertCount * 20, 60);
    score -= Math.min(c.failureRatePercent * 2, 40);
    return Math.max(0, Math.round(score));
  }

  private classify(score: number): HealthLevel {
    if (score >= 90) return 'HEALTHY';
    if (score >= 70) return 'DEGRADED';
    if (score >= 50) return 'WARNING';
    return 'CRITICAL';
  }

  isHealthy():  boolean { return this.level === 'HEALTHY'; }
  isCritical(): boolean { return this.level === 'CRITICAL'; }
}
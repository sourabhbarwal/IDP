import { DoraLevel, DORA_THRESHOLDS } from '../enums/dora-level.enum';

export interface DeploymentFrequencyTrend {
  date:        string; // ISO date string YYYY-MM-DD
  deployments: number;
  failures:    number;
}

export interface DoraMetricsProps {
  /** Average deployments per day over the window */
  deploymentFrequencyPerDay: number;
  /** Average time from deployment start → completion (hours) */
  leadTimeHours: number;
  /** Percentage of deployments that failed or were rolled back */
  changeFailureRatePercent: number;
  /** Average time from alert fired → resolved/acknowledged (hours) */
  mttrHours: number;
  /** Daily deployment trend for the chart */
  deploymentTrend: DeploymentFrequencyTrend[];
  /** Window size used for computation (days) */
  windowDays: number;
  /** Total deployments in the window */
  totalDeployments: number;
  /** Total failed deployments */
  totalFailures: number;
  /** Total alerts resolved */
  totalIncidents: number;
}

/**
 * DoraMetrics — the 4 key DevOps Research and Assessment metrics.
 * Computed from deployment + alert data in the shared PostgreSQL database.
 * Not persisted — computed on demand.
 */
export class DoraMetrics {
  readonly deploymentFrequencyPerDay: number;
  readonly leadTimeHours:             number;
  readonly changeFailureRatePercent:  number;
  readonly mttrHours:                 number;
  readonly deploymentTrend:           DeploymentFrequencyTrend[];
  readonly windowDays:                number;
  readonly totalDeployments:          number;
  readonly totalFailures:             number;
  readonly totalIncidents:            number;

  constructor(props: DoraMetricsProps) {
    this.deploymentFrequencyPerDay = props.deploymentFrequencyPerDay;
    this.leadTimeHours             = props.leadTimeHours;
    this.changeFailureRatePercent  = props.changeFailureRatePercent;
    this.mttrHours                 = props.mttrHours;
    this.deploymentTrend           = props.deploymentTrend;
    this.windowDays                = props.windowDays;
    this.totalDeployments          = props.totalDeployments;
    this.totalFailures             = props.totalFailures;
    this.totalIncidents            = props.totalIncidents;
  }

  /**
   * Classify overall DORA performance level.
   * A service is classified at the level where ALL four metrics meet
   * or exceed the threshold. Falls back to the next level down.
   */
  classifyLevel(): DoraLevel {
    const levels = [DoraLevel.ELITE, DoraLevel.HIGH, DoraLevel.MEDIUM];

    for (const level of levels) {
      const t = DORA_THRESHOLDS[level];
      if (
        this.deploymentFrequencyPerDay >= t.deployFreqPerDay &&
        this.leadTimeHours             <= t.leadTimeHours &&
        this.changeFailureRatePercent  <= t.cfrPercent &&
        this.mttrHours                 <= t.mttrHours
      ) {
        return level;
      }
    }

    return DoraLevel.LOW;
  }

  /**
   * Per-metric classifications — useful for showing which specific
   * metric is dragging the overall level down.
   */
  classifyEachMetric(): Record<string, DoraLevel> {
    const classify = (
      value: number,
      metricKey: keyof typeof DORA_THRESHOLDS[DoraLevel.ELITE],
      isLowerBetter = true,
    ): DoraLevel => {
      const levels = [DoraLevel.ELITE, DoraLevel.HIGH, DoraLevel.MEDIUM];
      for (const level of levels) {
        const threshold = DORA_THRESHOLDS[level][metricKey] as number;
        const passes = isLowerBetter
          ? value <= threshold
          : value >= threshold;
        if (passes) return level;
      }
      return DoraLevel.LOW;
    };

    return {
      deploymentFrequency: classify(
        this.deploymentFrequencyPerDay,
        'deployFreqPerDay',
        false, // higher is better
      ),
      leadTime:          classify(this.leadTimeHours,            'leadTimeHours'),
      changeFailureRate: classify(this.changeFailureRatePercent, 'cfrPercent'),
      mttr:              classify(this.mttrHours,                'mttrHours'),
    };
  }
}
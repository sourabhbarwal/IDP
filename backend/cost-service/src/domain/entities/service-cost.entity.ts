export type RightsizingStatus = 'OPTIMAL' | 'OVERSIZED' | 'UNDERSIZED' | 'IDLE';

export interface ResourceUsage {
  cpuCores: number;        // actual average CPU usage
  memoryMb: number;        // actual average memory usage
  requestsPerMin: number;  // average request rate
}

export interface ServiceCostProps {
  serviceName: string;
  namespace: string;
  usage: ResourceUsage;
  estimatedHourlyCostUsd: number;
  estimatedMonthlyCostUsd: number;
  rightsizingStatus: RightsizingStatus;
  recommendations: string[];
  wastagePercent: number;  // how much of provisioned resource is unused
  measuredAt: Date;
}

/**
 * ServiceCost — computed cost and rightsizing analysis for one service.
 * Not persisted — computed on demand from Prometheus metrics.
 */
export class ServiceCost {
  readonly serviceName!: string;
  readonly namespace!: string;
  readonly usage!: ResourceUsage;
  readonly estimatedHourlyCostUsd!: number;
  readonly estimatedMonthlyCostUsd!: number;
  readonly rightsizingStatus!: RightsizingStatus;
  readonly recommendations!: string[];
  readonly wastagePercent!: number;
  readonly measuredAt!: Date;

  constructor(props: ServiceCostProps) {
    Object.assign(this, props);
  }

  isIdle(): boolean { return this.rightsizingStatus === 'IDLE'; }
  isOversized(): boolean { return this.rightsizingStatus === 'OVERSIZED'; }
  monthlySavingsIfRightsized(): number {
    return this.estimatedMonthlyCostUsd * (this.wastagePercent / 100);
  }
}
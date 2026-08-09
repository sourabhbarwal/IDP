import { DoraMetrics } from './dora-metrics.entity';
import { DoraLevel } from '../enums/dora-level.enum';

function makeMetrics(overrides: Partial<ConstructorParameters<typeof DoraMetrics>[0]> = {}): DoraMetrics {
  return new DoraMetrics({
    deploymentFrequencyPerDay: 2,
    leadTimeHours:             0.5,
    changeFailureRatePercent:  2,
    mttrHours:                 0.5,
    deploymentTrend:           [],
    windowDays:                30,
    totalDeployments:          60,
    totalFailures:             1,
    totalIncidents:            5,
    ...overrides,
  });
}

describe('DoraMetrics — classifyLevel()', () => {
  it('classifies Elite when all metrics meet Elite thresholds', () => {
    const m = makeMetrics({
      deploymentFrequencyPerDay: 2,
      leadTimeHours:             0.5,
      changeFailureRatePercent:  3,
      mttrHours:                 0.5,
    });
    expect(m.classifyLevel()).toBe(DoraLevel.ELITE);
  });

  it('classifies High when deploy freq is weekly but not daily', () => {
    const m = makeMetrics({
      deploymentFrequencyPerDay: 0.2,  // ~1.4/week
      leadTimeHours:             12,
      changeFailureRatePercent:  8,
      mttrHours:                 12,
    });
    expect(m.classifyLevel()).toBe(DoraLevel.HIGH);
  });

  it('classifies Medium when deploy freq is monthly', () => {
    const m = makeMetrics({
      deploymentFrequencyPerDay: 0.05, // ~1.5/month
      leadTimeHours:             48,
      changeFailureRatePercent:  12,
      mttrHours:                 48,
    });
    expect(m.classifyLevel()).toBe(DoraLevel.MEDIUM);
  });

  it('classifies Low when metrics are poor', () => {
    const m = makeMetrics({
      deploymentFrequencyPerDay: 0.01, // <1/month
      leadTimeHours:             500,
      changeFailureRatePercent:  30,
      mttrHours:                 200,
    });
    expect(m.classifyLevel()).toBe(DoraLevel.LOW);
  });

  it('drops to High if ONE metric fails Elite but stays within High threshold', () => {
    // Everything Elite except MTTR, which is High-range (not Elite, but <=24h)
    const m = makeMetrics({
      deploymentFrequencyPerDay: 2,
      leadTimeHours:             0.5,
      changeFailureRatePercent:  3,
      mttrHours:                 12,  // High (<=24h), not Elite (<=1h)
    });
    expect(m.classifyLevel()).toBe(DoraLevel.HIGH);
  });
});

describe('DoraMetrics — classifyEachMetric()', () => {
  it('classifies each metric independently', () => {
    const m = makeMetrics({
      deploymentFrequencyPerDay: 2,    // Elite
      leadTimeHours:             12,   // High
      changeFailureRatePercent:  12,   // Medium
      mttrHours:                 0.5,  // Elite
    });
    const result = m.classifyEachMetric();
    expect(result['deploymentFrequency']).toBe(DoraLevel.ELITE);
    expect(result['leadTime']).toBe(DoraLevel.HIGH);
    expect(result['changeFailureRate']).toBe(DoraLevel.MEDIUM);
    expect(result['mttr']).toBe(DoraLevel.ELITE);
  });
});
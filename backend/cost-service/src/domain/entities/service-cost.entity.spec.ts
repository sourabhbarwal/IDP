import { ServiceCost } from './service-cost.entity';

function makeCost(overrides: Partial<ConstructorParameters<typeof ServiceCost>[0]> = {}): ServiceCost {
  return new ServiceCost({
    serviceName: 'auth-service',
    namespace: 'dev-auth-service',
    usage: { cpuCores: 0.05, memoryMb: 128, requestsPerMin: 10 },
    estimatedHourlyCostUsd: 0.003,
    estimatedMonthlyCostUsd: 2.19,
    rightsizingStatus: 'OPTIMAL',
    recommendations: ['Resource usage looks optimal.'],
    wastagePercent: 10,
    measuredAt: new Date(),
    ...overrides,
  });
}

describe('ServiceCost domain entity', () => {
  it('isIdle() returns true when status is IDLE', () => {
    expect(makeCost({ rightsizingStatus: 'IDLE' }).isIdle()).toBe(true);
  });

  it('isOversized() returns true when status is OVERSIZED', () => {
    expect(makeCost({ rightsizingStatus: 'OVERSIZED' }).isOversized()).toBe(true);
  });

  it('monthlySavingsIfRightsized() computes correctly', () => {
    const cost = makeCost({ estimatedMonthlyCostUsd: 10, wastagePercent: 40 });
    expect(cost.monthlySavingsIfRightsized()).toBeCloseTo(4, 1);
  });

  it('monthlySavingsIfRightsized() returns 0 for optimal services', () => {
    const cost = makeCost({ wastagePercent: 0 });
    expect(cost.monthlySavingsIfRightsized()).toBe(0);
  });
});
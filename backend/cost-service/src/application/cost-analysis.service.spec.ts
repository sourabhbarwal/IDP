import { CostAnalysisService } from './cost-analysis.service';
import { ConfigService } from '@nestjs/config';
import { ServiceCost } from '../domain/entities/service-cost.entity';

const mockConfig = {
  get: jest.fn((key: string, def?: string) => {
    if (key === 'PROMETHEUS_URL') return 'http://localhost:9090';
    return def ?? '';
  }),
} as unknown as ConfigService;

describe('CostAnalysisService', () => {
  let service: CostAnalysisService;

  beforeEach(() => {
    service = new CostAnalysisService(mockConfig);
  });

  it('getServiceCost returns ServiceCost with defaults when Prometheus unreachable', async () => {
    const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

    expect(cost).toBeInstanceOf(ServiceCost);
    expect(cost.serviceName).toBe('auth-service');
    expect(cost.namespace).toBe('dev-auth-service');
    expect(typeof cost.estimatedHourlyCostUsd).toBe('number');
    expect(typeof cost.estimatedMonthlyCostUsd).toBe('number');
    expect(cost.recommendations.length).toBeGreaterThan(0);
    expect(cost.measuredAt).toBeInstanceOf(Date);
  });

  it('getAllServiceCosts returns array (may be partial when Prometheus unavailable)', async () => {
    const costs = await service.getAllServiceCosts();
    expect(Array.isArray(costs)).toBe(true);
  });

  it('getPlatformTotals returns numeric totals', async () => {
    const totals = await service.getPlatformTotals();
    expect(typeof totals.totalMonthlyCostUsd).toBe('number');
    expect(typeof totals.potentialSavingsUsd).toBe('number');
    expect(Array.isArray(totals.idleServices)).toBe(true);
    expect(Array.isArray(totals.oversizedServices)).toBe(true);
  });
});
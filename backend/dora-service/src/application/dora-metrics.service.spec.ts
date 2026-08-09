import { DoraMetricsService } from './dora-metrics.service';
import { DoraMetrics } from '../domain/entities/dora-metrics.entity';

const mockDb = {
  query: jest.fn(),
};

describe('DoraMetricsService', () => {
  let service: DoraMetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DoraMetricsService(mockDb as never);
  });

  it('returns zeroed DoraMetrics when schemas are empty', async () => {
    mockDb.query
      .mockResolvedValueOnce([])  // deployments
      .mockResolvedValueOnce([{ avg_mttr_seconds: null, total_incidents: '0' }]); // mttr

    const metrics = await service.compute(30);

    expect(metrics).toBeInstanceOf(DoraMetrics);
    expect(metrics.deploymentFrequencyPerDay).toBe(0);
    expect(metrics.changeFailureRatePercent).toBe(0);
    expect(metrics.mttrHours).toBe(0);
    expect(metrics.totalDeployments).toBe(0);
  });

  it('computes correct deployment frequency from daily rows', async () => {
    // 30 successful deployments over 30 days = 1/day
    mockDb.query
      .mockResolvedValueOnce([
        { day: '2024-01-01', total: '10', succeeded: '10', failed: '0', avg_duration_seconds: '1800' },
        { day: '2024-01-02', total: '10', succeeded: '10', failed: '0', avg_duration_seconds: '1800' },
        { day: '2024-01-03', total: '10', succeeded: '10', failed: '0', avg_duration_seconds: '1800' },
      ])
      .mockResolvedValueOnce([{ avg_mttr_seconds: '3600', total_incidents: '5' }]);

    const metrics = await service.compute(30);

    expect(metrics.totalDeployments).toBe(30);
    expect(metrics.deploymentFrequencyPerDay).toBe(1);  // 30 succeeded / 30 days
    expect(metrics.leadTimeHours).toBe(0.5);             // 1800s = 0.5h
    expect(metrics.mttrHours).toBe(1);                   // 3600s = 1h
    expect(metrics.deploymentTrend).toHaveLength(3);
  });

  it('computes correct change failure rate', async () => {
    // 2 failed out of 10 total = 20%
    mockDb.query
      .mockResolvedValueOnce([
        { day: '2024-01-01', total: '10', succeeded: '8', failed: '2', avg_duration_seconds: '900' },
      ])
      .mockResolvedValueOnce([{ avg_mttr_seconds: null, total_incidents: '0' }]);

    const metrics = await service.compute(30);

    expect(metrics.totalFailures).toBe(2);
    expect(metrics.changeFailureRatePercent).toBe(20);
  });

  it('returns empty trend when query fails', async () => {
    mockDb.query
      .mockRejectedValueOnce(new Error('schema does not exist'))
      .mockRejectedValueOnce(new Error('schema does not exist'));

    const metrics = await service.compute(30);

    expect(metrics.deploymentTrend).toHaveLength(0);
    expect(metrics.totalDeployments).toBe(0);
  });
});
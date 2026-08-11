import { HealthScore } from './health-score.value-object';

describe('HealthScore', () => {
  it('returns 100 with no alerts and 0% failure rate', () => {
    const hs = new HealthScore({ activeAlertCount: 0, failureRatePercent: 0, hasDeployments: true });
    expect(hs.score).toBe(100);
    expect(hs.level).toBe('HEALTHY');
  });

  it('deducts 20 per active alert', () => {
    const hs = new HealthScore({ activeAlertCount: 2, failureRatePercent: 0, hasDeployments: true });
    expect(hs.score).toBe(60);
    expect(hs.level).toBe('WARNING');
  });

  it('caps alert deduction at 60 (3+ alerts)', () => {
    const hs = new HealthScore({ activeAlertCount: 5, failureRatePercent: 0, hasDeployments: true });
    expect(hs.score).toBe(40);
    expect(hs.level).toBe('CRITICAL');
  });

  it('deducts 2 per percent failure rate', () => {
    const hs = new HealthScore({ activeAlertCount: 0, failureRatePercent: 10, hasDeployments: true });
    expect(hs.score).toBe(80);
    expect(hs.level).toBe('DEGRADED');
  });

  it('caps failure rate deduction at 40', () => {
    const hs = new HealthScore({ activeAlertCount: 0, failureRatePercent: 100, hasDeployments: true });
    expect(hs.score).toBe(60);
    expect(hs.level).toBe('WARNING');
  });

  it('combines both deductions correctly', () => {
    // 1 alert (-20) + 10% failure (-20) = 60
    const hs = new HealthScore({ activeAlertCount: 1, failureRatePercent: 10, hasDeployments: true });
    expect(hs.score).toBe(60);
    expect(hs.level).toBe('WARNING');
  });

  it('never goes below 0', () => {
    const hs = new HealthScore({ activeAlertCount: 5, failureRatePercent: 100, hasDeployments: false });
    expect(hs.score).toBeGreaterThanOrEqual(0);
  });

  it('isCritical() returns true below 50', () => {
    const hs = new HealthScore({ activeAlertCount: 4, failureRatePercent: 20, hasDeployments: true });
    expect(hs.isCritical()).toBe(true);
  });
});
import { CostAnalysisService } from './cost-analysis.service';
import { ConfigService } from '@nestjs/config';
import { ServiceCost } from '../domain/entities/service-cost.entity';

const mockConfig = {
  get: jest.fn((key: string, def?: string) => {
    if (key === 'PROMETHEUS_URL') return 'http://localhost:9090';
    return def ?? '';
  }),
} as unknown as ConfigService;

function prometheusScalarResponse(value: string) {
  return {
    ok: true,
    json: async () => ({
      status: 'success',
      data: { resultType: 'vector', result: [{ metric: {}, value: [0, value] }] },
    }),
  } as Response;
}

function prometheusEmptyResponse() {
  return {
    ok: true,
    json: async () => ({ status: 'success', data: { resultType: 'vector', result: [] } }),
  } as Response;
}

function prometheusErrorStatusResponse() {
  return {
    ok: true,
    json: async () => ({ status: 'error', data: { resultType: 'vector', result: [] } }),
  } as Response;
}

describe('CostAnalysisService', () => {
  let service: CostAnalysisService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new CostAnalysisService(mockConfig);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── queryPrometheus / extractScalarValue branches ─────────────────────────

  describe('Prometheus query branches', () => {
    it('getServiceCost returns defaults when fetch rejects (network error)', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost).toBeInstanceOf(ServiceCost);
      // defaults from extractScalarValue ?? fallback
      expect(cost.usage.cpuCores).toBeCloseTo(0.05, 3);
      expect(cost.usage.memoryMb).toBe(128);
      expect(cost.usage.requestsPerMin).toBe(0);
    });

    it('getServiceCost returns defaults when response is not ok (non-2xx)', async () => {
      fetchSpy.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.usage.cpuCores).toBeCloseTo(0.05, 3);
      expect(cost.usage.memoryMb).toBe(128);
    });

    it('getServiceCost returns defaults when Prometheus status is "error"', async () => {
      fetchSpy.mockResolvedValue(prometheusErrorStatusResponse());

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.usage.cpuCores).toBeCloseTo(0.05, 3);
    });

    it('getServiceCost returns defaults when result array is empty', async () => {
      fetchSpy.mockResolvedValue(prometheusEmptyResponse());

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.usage.cpuCores).toBeCloseTo(0.05, 3);
      expect(cost.usage.requestsPerMin).toBe(0);
    });

    it('getServiceCost returns defaults when value is NaN', async () => {
      fetchSpy.mockResolvedValue(prometheusScalarResponse('not-a-number'));

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.usage.cpuCores).toBeCloseTo(0.05, 3);
    });

    it('getServiceCost uses real scalar values when Prometheus responds successfully', async () => {
      // cpu, memory(MB via bytes/1024/1024 already applied by promql, mocked directly), requests/sec
      fetchSpy
        .mockResolvedValueOnce(prometheusScalarResponse('0.25'))   // cpu
        .mockResolvedValueOnce(prometheusScalarResponse('256'))    // memory MB
        .mockResolvedValueOnce(prometheusScalarResponse('2'));     // req/sec

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.usage.cpuCores).toBeCloseTo(0.25, 3);
      expect(cost.usage.memoryMb).toBe(256);
      expect(cost.usage.requestsPerMin).toBeCloseTo(120, 1); // 2 req/sec * 60
      expect(cost.estimatedHourlyCostUsd).toBeGreaterThan(0);
    });
  });

  // ── analyseRightsizing branches (via getServiceCost, using mocked fetch) ──

  describe('rightsizing status branches', () => {
    it('marks a service IDLE when request rate is near-zero', async () => {
      fetchSpy
        .mockResolvedValueOnce(prometheusScalarResponse('0.5'))
        .mockResolvedValueOnce(prometheusScalarResponse('256'))
        .mockResolvedValueOnce(prometheusScalarResponse('0')); // requestsPerSec = 0

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('IDLE');
      expect(cost.isIdle()).toBe(true);
      expect(cost.wastagePercent).toBe(80);
      expect(cost.recommendations[0]).toMatch(/near-zero traffic/i);
    });

    it('marks a service OVERSIZED when CPU and memory usage are very low but traffic exists', async () => {
      fetchSpy
        .mockResolvedValueOnce(prometheusScalarResponse('0.02'))  // < 0.05 cpu → wastage 60
        .mockResolvedValueOnce(prometheusScalarResponse('32'))    // < 64 mem → wastage 50
        .mockResolvedValueOnce(prometheusScalarResponse('1'));    // active traffic

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OVERSIZED');
      expect(cost.isOversized()).toBe(true);
      expect(cost.wastagePercent).toBe(60);
      expect(cost.recommendations).toContain('CPU usage is very low. Consider reducing CPU requests to 50m.');
      expect(cost.recommendations).toContain('Memory usage is very low. Consider reducing memory limit to 128Mi.');
    });

    it('marks a service OPTIMAL with a mid-range low-CPU recommendation (30% wastage branch)', async () => {
      fetchSpy
        .mockResolvedValueOnce(prometheusScalarResponse('0.08'))  // between 0.05 and 0.1 → wastage 30
        .mockResolvedValueOnce(prometheusScalarResponse('200'))   // >= 128 → no memory recommendation added
        .mockResolvedValueOnce(prometheusScalarResponse('1'));

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OPTIMAL');
      expect(cost.wastagePercent).toBe(30);
      expect(cost.recommendations).toContain('CPU usage is low. Current allocation appears sufficient.');
    });

    it('marks a service OPTIMAL with the mid-range memory recommendation (64-128MB branch)', async () => {
      fetchSpy
        .mockResolvedValueOnce(prometheusScalarResponse('0.5'))   // healthy cpu, no recommendation
        .mockResolvedValueOnce(prometheusScalarResponse('100'))   // between 64 and 128 → informational only
        .mockResolvedValueOnce(prometheusScalarResponse('1'));

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.wastagePercent).toBe(0);
      expect(cost.recommendations).toContain('Memory usage is within expected range for a NestJS service.');
    });

    it('marks a fully healthy service OPTIMAL with the fallback "looks optimal" message', async () => {
      fetchSpy
        .mockResolvedValueOnce(prometheusScalarResponse('0.5'))   // healthy cpu
        .mockResolvedValueOnce(prometheusScalarResponse('256'))   // healthy memory
        .mockResolvedValueOnce(prometheusScalarResponse('5'));    // healthy traffic

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OPTIMAL');
      expect(cost.wastagePercent).toBe(0);
      expect(cost.recommendations).toEqual(['Resource usage looks optimal for current traffic levels.']);
    });
  });

  // ── Aggregate methods ──────────────────────────────────────────────────────

  describe('getAllServiceCosts', () => {
    it('returns a ServiceCost for every configured service when Prometheus is reachable', async () => {
      fetchSpy.mockResolvedValue(prometheusScalarResponse('0.1'));

      const costs = await service.getAllServiceCosts();

      expect(Array.isArray(costs)).toBe(true);
      expect(costs.length).toBe(9); // matches the hardcoded services list
      expect(costs.every((c) => c instanceof ServiceCost)).toBe(true);
    });

    it('still returns results (with defaults) when Prometheus is unreachable', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

      const costs = await service.getAllServiceCosts();

      expect(costs.length).toBe(9);
    });
  });

  describe('getPlatformTotals', () => {
    it('aggregates totals and flags idle/oversized services correctly', async () => {
      // First service call gets IDLE values, rest get healthy values
      let call = 0;
      fetchSpy.mockImplementation(() => {
        call += 1;
        // Every group of 3 fetches = one service (cpu, mem, req)
        const serviceIndex = Math.floor((call - 1) / 3);
        if (serviceIndex === 0) {
          // auth-service: idle
          const idx = (call - 1) % 3;
          return Promise.resolve(
            idx === 2 ? prometheusScalarResponse('0') : prometheusScalarResponse('0.5'),
          );
        }
        return Promise.resolve(prometheusScalarResponse('1'));
      });

      const totals = await service.getPlatformTotals();

      expect(typeof totals.totalMonthlyCostUsd).toBe('number');
      expect(typeof totals.potentialSavingsUsd).toBe('number');
      expect(totals.idleServices).toContain('auth-service');
      expect(Array.isArray(totals.oversizedServices)).toBe(true);
    });

    it('returns zero totals gracefully with no services costing anything unexpected', async () => {
      fetchSpy.mockRejectedValue(new Error('unreachable'));

      const totals = await service.getPlatformTotals();

      expect(totals.totalMonthlyCostUsd).toBeGreaterThanOrEqual(0);
      expect(totals.potentialSavingsUsd).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Single-service accessor (kept from original suite) ────────────────────

  it('getServiceCost returns ServiceCost with defaults when Prometheus unreachable', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

    expect(cost).toBeInstanceOf(ServiceCost);
    expect(cost.serviceName).toBe('auth-service');
    expect(cost.namespace).toBe('dev-auth-service');
    expect(typeof cost.estimatedHourlyCostUsd).toBe('number');
    expect(typeof cost.estimatedMonthlyCostUsd).toBe('number');
    expect(cost.recommendations.length).toBeGreaterThan(0);
    expect(cost.measuredAt).toBeInstanceOf(Date);
  });
});
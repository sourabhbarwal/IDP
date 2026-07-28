import { CostAnalysisService } from './cost-analysis.service';
import { ConfigService } from '@nestjs/config';
import { ServiceCost } from '../domain/entities/service-cost.entity';

const mockConfig = {
  get: jest.fn((key: string, def?: string) => {
    if (key === 'PROMETHEUS_URL') return 'http://localhost:9090';
    return def ?? '';
  }),
} as unknown as ConfigService;

let fetchSpy: jest.SpyInstance;

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

/**
 * Mocks fetch by inspecting the PromQL query embedded in the URL, rather than
 * relying on call order. The real service issues CPU/memory/request queries
 * concurrently (Promise.all), and each of CPU/memory can fire a second
 * "fallback" fetch if the primary (cAdvisor) query returns nothing — so
 * positional mockResolvedValueOnce chains are unreliable here.
 */
function mockPrometheusByQuery(responses: {
  cpu?: string | null;
  memory?: string | null;
  requests?: string | null;
}) {
  fetchSpy.mockImplementation(((url: string) => {
    const decoded = decodeURIComponent(url);

    if (decoded.includes('http_requests_total')) {
      return Promise.resolve(
        responses.requests === undefined || responses.requests === null
          ? prometheusEmptyResponse()
          : prometheusScalarResponse(responses.requests),
      );
    }
    if (
      decoded.includes('container_cpu_usage_seconds_total') ||
      decoded.includes('process_cpu_seconds_total')
    ) {
      return Promise.resolve(
        responses.cpu === undefined || responses.cpu === null
          ? prometheusEmptyResponse()
          : prometheusScalarResponse(responses.cpu),
      );
    }
    if (
      decoded.includes('container_memory_working_set_bytes') ||
      decoded.includes('process_resident_memory_bytes')
    ) {
      return Promise.resolve(
        responses.memory === undefined || responses.memory === null
          ? prometheusEmptyResponse()
          : prometheusScalarResponse(responses.memory),
      );
    }
    return Promise.resolve(prometheusEmptyResponse());
  }) as unknown as typeof fetch);
}

/**
 * For multi-service tests: routes by job="X" (process fallback queries) or
 * name="idp-X" (cAdvisor queries) embedded in the query string, so different
 * services can be given different values in the same test.
 */
function mockPrometheusPerService(
  overrides: Record<string, { cpu?: string; memory?: string; requests?: string }>,
  defaults: { cpu: string; memory: string; requests: string } = {
    cpu: '0.5',
    memory: '256',
    requests: '1',
  },
) {
  fetchSpy.mockImplementation(((url: string) => {
    const decoded = decodeURIComponent(url);
    const jobMatch = decoded.match(/job="([^"]+)"/);
    const nameMatch = decoded.match(/name="idp-([^"]+)"/);
    const svcName = jobMatch?.[1] ?? nameMatch?.[1];
    const vals = (svcName && overrides[svcName]) || {};

    if (decoded.includes('http_requests_total')) {
      return Promise.resolve(prometheusScalarResponse(vals.requests ?? defaults.requests));
    }
    if (
      decoded.includes('container_cpu_usage_seconds_total') ||
      decoded.includes('process_cpu_seconds_total')
    ) {
      return Promise.resolve(prometheusScalarResponse(vals.cpu ?? defaults.cpu));
    }
    if (
      decoded.includes('container_memory_working_set_bytes') ||
      decoded.includes('process_resident_memory_bytes')
    ) {
      return Promise.resolve(prometheusScalarResponse(vals.memory ?? defaults.memory));
    }
    return Promise.resolve(prometheusEmptyResponse());
  }) as unknown as typeof fetch);
}

describe('CostAnalysisService', () => {
  let service: CostAnalysisService;

  beforeEach(() => {
    service = new CostAnalysisService(mockConfig);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── Prometheus query branches ──────────────────────────────────────────

  describe('Prometheus query branches', () => {
    it('getServiceCost returns defaults when fetch rejects (network error)', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost).toBeInstanceOf(ServiceCost);
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

    it('getServiceCost uses real scalar values when the cAdvisor queries respond successfully', async () => {
      mockPrometheusByQuery({ cpu: '0.25', memory: '256', requests: '2' });

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.usage.cpuCores).toBeCloseTo(0.25, 3);
      expect(cost.usage.memoryMb).toBe(256);
      expect(cost.usage.requestsPerMin).toBeCloseTo(120, 1); // 2 req/sec * 60
      expect(cost.estimatedHourlyCostUsd).toBeGreaterThan(0);
    });
  });

  // ── analyseRightsizing branches ────────────────────────────────────────

  describe('rightsizing status branches', () => {
    it('marks a service IDLE when request rate is near-zero', async () => {
      mockPrometheusByQuery({ cpu: '0.5', memory: '256', requests: '0' });

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('IDLE');
      expect(cost.isIdle()).toBe(true);
      expect(cost.wastagePercent).toBe(80);
      expect(cost.recommendations[0]).toMatch(/near-zero traffic/i);
    });

    it('marks a service OVERSIZED when CPU is low and memory is very low, with traffic present', async () => {
      // cpu 0.02 -> "low" branch (wastage 30); memory 32 -> "very low" branch (wastage 60)
      // combined wastage = max(30, 60) = 60 -> OVERSIZED
      mockPrometheusByQuery({ cpu: '0.02', memory: '32', requests: '1' });

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OVERSIZED');
      expect(cost.isOversized()).toBe(true);
      expect(cost.wastagePercent).toBe(60);
      expect(cost.recommendations).toContain(
        'CPU usage is low (20.0m cores). Current allocation is adequate.',
      );
      expect(cost.recommendations).toContain(
        'Memory usage is very low (32MB). Consider reducing memory limit to 128Mi.',
      );
    });

    it('marks a service OPTIMAL with the low-CPU recommendation when memory is healthy', async () => {
      // cpu 0.03 -> "low" branch (wastage 30); memory 200 -> no branch triggered
      mockPrometheusByQuery({ cpu: '0.03', memory: '200', requests: '1' });

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OPTIMAL');
      expect(cost.wastagePercent).toBe(30);
      expect(cost.recommendations).toContain(
        'CPU usage is low (30.0m cores). Current allocation is adequate.',
      );
    });

    it('marks a service OPTIMAL with the informational mid-range memory message (50-100MB)', async () => {
      // cpu 0.5 -> healthy, no message; memory 80 -> "normal for NestJS" informational branch
      mockPrometheusByQuery({ cpu: '0.5', memory: '80', requests: '1' });

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OPTIMAL');
      expect(cost.wastagePercent).toBe(0);
      expect(cost.recommendations).toContain(
        'Memory usage is normal for a NestJS service (80MB). No change needed.',
      );
    });

    it('marks a service OPTIMAL with the high-memory warning when usage exceeds 400MB', async () => {
      mockPrometheusByQuery({ cpu: '0.5', memory: '450', requests: '1' });

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OPTIMAL');
      expect(cost.recommendations).toContain(
        'Memory usage is high (450MB). Check for memory leaks — should be <256MB for a typical NestJS service.',
      );
    });

    it('marks a fully healthy service OPTIMAL with the fallback summary message', async () => {
      // cpu 0.5 (healthy), memory 256 (healthy, no branch triggered), req 5/sec = 300/min
      mockPrometheusByQuery({ cpu: '0.5', memory: '256', requests: '5' });

      const cost = await service.getServiceCost('auth-service', 'dev-auth-service');

      expect(cost.rightsizingStatus).toBe('OPTIMAL');
      expect(cost.wastagePercent).toBe(0);
      expect(cost.recommendations).toEqual([
        'Resource usage is optimal. CPU: 500.0m, Memory: 256MB, Requests: 300.0/min.',
      ]);
    });
  });

  // ── Aggregate methods ───────────────────────────────────────────────────

  describe('getAllServiceCosts', () => {
    it('returns a ServiceCost for every configured service when Prometheus is reachable', async () => {
      mockPrometheusByQuery({ cpu: '0.1', memory: '128', requests: '1' });

      const costs = await service.getAllServiceCosts();

      expect(Array.isArray(costs)).toBe(true);
      expect(costs.length).toBe(12); // all 12 platform services
      expect(costs.every((c) => c instanceof ServiceCost)).toBe(true);
    });

    it('still returns results (with defaults) when Prometheus is unreachable', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

      const costs = await service.getAllServiceCosts();

      expect(costs.length).toBe(12);
    });
  });

  describe('getPlatformTotals', () => {
    it('aggregates totals and flags idle/oversized services correctly', async () => {
      mockPrometheusPerService(
        { 'auth-service': { requests: '0' } }, // only auth-service is idle
        { cpu: '0.5', memory: '256', requests: '1' }, // everyone else is healthy
      );

      const totals = await service.getPlatformTotals();

      expect(typeof totals.totalMonthlyCostUsd).toBe('number');
      expect(typeof totals.potentialSavingsUsd).toBe('number');
      expect(totals.idleServices).toContain('auth-service');
      expect(Array.isArray(totals.oversizedServices)).toBe(true);
    });

    it('returns zero-or-more totals gracefully when Prometheus is entirely unreachable', async () => {
      fetchSpy.mockRejectedValue(new Error('unreachable'));

      const totals = await service.getPlatformTotals();

      expect(totals.totalMonthlyCostUsd).toBeGreaterThanOrEqual(0);
      expect(totals.potentialSavingsUsd).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Single-service accessor ─────────────────────────────────────────────

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
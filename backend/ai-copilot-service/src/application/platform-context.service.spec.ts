import { PlatformContextService } from './platform-context.service';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerRegistry } from '@idp/common';

const mockConfig = {
  get: jest.fn((key: string, def?: string) => {
    const map: Record<string, string> = {
      ALERT_SERVICE_URL: 'http://localhost:3008',
      COST_SERVICE_URL: 'http://localhost:3011',
      MONITORING_SERVICE_URL: 'http://localhost:3006',
    };
    return map[key] ?? def ?? '';
  }),
} as unknown as ConfigService;

describe('PlatformContextService', () => {
  let service: PlatformContextService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    const cbRegistry = new CircuitBreakerRegistry();
    service = new PlatformContextService(mockConfig, cbRegistry);
    service.onModuleInit(); // circuit breakers are created here, not in the constructor
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('when downstream services are unreachable', () => {
    it('gatherFullContext returns empty arrays and no sources', async () => {
      const ctx = await service.gatherFullContext('Bearer test-token');
      expect(ctx.activeAlerts).toEqual([]);
      expect(ctx.costSummary).toBeNull();
      expect(ctx.servicesMetrics).toEqual([]);
      expect(ctx.sources).toEqual([]);
    });

    it('gatherAlertContext returns empty alerts and no sources', async () => {
      const ctx = await service.gatherAlertContext('Bearer test-token');
      expect(ctx.alerts).toEqual([]);
      expect(ctx.sources).toEqual([]);
    });

    it('gatherCostContext returns null cost and no sources', async () => {
      const ctx = await service.gatherCostContext('Bearer test-token');
      expect(ctx.cost).toBeNull();
      expect(ctx.services).toEqual([]);
      expect(ctx.sources).toEqual([]);
    });
  });

  describe('when downstream services respond successfully', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/alerts/active')) {
          return Promise.resolve({ ok: true, json: async () => [{ id: 'alert-1' }] });
        }
        if (url.includes('/cost/summary')) {
          return Promise.resolve({ ok: true, json: async () => ({ total: 100 }) });
        }
        if (url.includes('/cost/services')) {
          return Promise.resolve({ ok: true, json: async () => [{ service: 'auth-service', cost: 10 }] });
        }
        if (url.includes('/metrics/services')) {
          return Promise.resolve({ ok: true, json: async () => [{ service: 'auth-service', cpu: 20 }] });
        }
        return Promise.resolve({ ok: false, status: 404 });
      }) as unknown as typeof fetch;
    });

    it('gatherFullContext aggregates all sources on success', async () => {
      const ctx = await service.gatherFullContext('Bearer token');
      expect(ctx.activeAlerts).toEqual([{ id: 'alert-1' }]);
      expect(ctx.costSummary).toEqual({ total: 100 });
      expect(ctx.servicesMetrics).toEqual([{ service: 'auth-service', cpu: 20 }]);
      expect(ctx.sources).toEqual(expect.arrayContaining(['alert-service', 'cost-service', 'monitoring-service']));
    });

    it('gatherAlertContext returns alerts and source on success', async () => {
      const ctx = await service.gatherAlertContext('Bearer token');
      expect(ctx.alerts).toEqual([{ id: 'alert-1' }]);
      expect(ctx.sources).toEqual(['alert-service']);
    });

    it('gatherCostContext returns cost summary, services and both sources on success', async () => {
      const ctx = await service.gatherCostContext('Bearer token');
      expect(ctx.cost).toEqual({ total: 100 });
      expect(ctx.services).toEqual([{ service: 'auth-service', cost: 10 }]);
      expect(ctx.sources).toEqual(['cost-service (summary)', 'cost-service (per-service)']);
    });
  });

  describe('when a downstream service returns a non-ok status', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    });

    it('gatherAlertContext swallows the error and returns empty state', async () => {
      const ctx = await service.gatherAlertContext('Bearer token');
      expect(ctx.alerts).toEqual([]);
      expect(ctx.sources).toEqual([]);
    });

    it('gatherCostContext swallows the error and returns empty state', async () => {
      const ctx = await service.gatherCostContext('Bearer token');
      expect(ctx.cost).toBeNull();
      expect(ctx.services).toEqual([]);
      expect(ctx.sources).toEqual([]);
    });
  });
});
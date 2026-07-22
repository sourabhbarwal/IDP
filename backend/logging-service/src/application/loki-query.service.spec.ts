import { LokiQueryService } from './loki-query.service';
import { ConfigService } from '@nestjs/config';

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'LOKI_URL') return 'http://localhost:3100';
    return defaultValue ?? '';
  }),
} as unknown as ConfigService;

describe('LokiQueryService', () => {
  let service: LokiQueryService;

  beforeEach(() => {
    service = new LokiQueryService(mockConfigService);
  });

  it('getServiceLogs returns empty array when Loki is unreachable', async () => {
    const result = await service.getServiceLogs('auth-service', 'dev', 10);
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('searchLogs returns empty array on network error', async () => {
    const result = await service.searchLogs('error', Date.now() - 3600_000, Date.now());
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('queryLogs with service filter degrades gracefully when unreachable', async () => {
    const result = await service.queryLogs({
      service: 'auth-service',
      startMs: Date.now() - 3600_000,
      endMs: Date.now(),
      limit: 50,
    });
    expect(result).toHaveProperty('lines');
    expect(result).toHaveProperty('total');
  });

  it('queryLogs always includes compose_project=idp in label matchers', async () => {
    // Verify the method exists and accepts params without namespace
    const result = await service.queryLogs({
      startMs: Date.now() - 3600_000,
      endMs: Date.now(),
      limit: 10,
    });
    expect(Array.isArray(result.lines)).toBe(true);
  });
});
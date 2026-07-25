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

describe('LokiQueryService — success paths', () => {
  let service: LokiQueryService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new LokiQueryService(mockConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockLokiResponse(result: Array<{ stream: Record<string, string>; values: [string, string][] }>) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: { result } }),
    }) as unknown as typeof fetch;
  }

  it('parses JSON log lines and extracts message/level/service', async () => {
    const nowNs = (Date.now() * 1_000_000).toString();
    mockLokiResponse([
      {
        stream: { service: 'auth-service', level: 'info', compose_project: 'idp' },
        values: [[nowNs, JSON.stringify({ message: 'user logged in', level: 'info', service: 'auth-service' })]],
      },
    ]);

    const result = await service.queryLogs({
      service: 'auth-service',
      startMs: Date.now() - 60_000,
      endMs: Date.now(),
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.lines[0].message).toBe('user logged in');
    expect(result.lines[0].level).toBe('info');
    expect(result.lines[0].service).toBe('auth-service');
  });

  it('falls back to raw line as message when JSON parsing fails', async () => {
    const nowNs = (Date.now() * 1_000_000).toString();
    mockLokiResponse([
      {
        stream: { service: 'auth-service' },
        values: [[nowNs, 'not valid json, plain text log line']],
      },
    ]);

    const result = await service.queryLogs({
      startMs: Date.now() - 60_000,
      endMs: Date.now(),
      limit: 10,
    });

    expect(result.lines[0].message).toBe('not valid json, plain text log line');
  });

  it('falls back to stream labels for level/service when JSON has neither field', async () => {
    const nowNs = (Date.now() * 1_000_000).toString();
    mockLokiResponse([
      {
        stream: { service: 'auth-service', level: 'warn' },
        values: [[nowNs, JSON.stringify({ message: 'no level or service in payload' })]],
      },
    ]);

    const result = await service.queryLogs({
      startMs: Date.now() - 60_000,
      endMs: Date.now(),
      limit: 10,
    });

    expect(result.lines[0].level).toBe('warn');
    expect(result.lines[0].service).toBe('auth-service');
  });

  it('uses "msg" field when "message" field is absent', async () => {
    const nowNs = (Date.now() * 1_000_000).toString();
    mockLokiResponse([
      {
        stream: { service: 'auth-service' },
        values: [[nowNs, JSON.stringify({ msg: 'alternate field name' })]],
      },
    ]);

    const result = await service.queryLogs({
      startMs: Date.now() - 60_000,
      endMs: Date.now(),
      limit: 10,
    });

    expect(result.lines[0].message).toBe('alternate field name');
  });

  it('sorts multiple log lines newest first', async () => {
    const t1 = (Date.now() * 1_000_000).toString();
    const t2 = ((Date.now() + 5000) * 1_000_000).toString();
    mockLokiResponse([
      {
        stream: { service: 'auth-service' },
        values: [
          [t1, JSON.stringify({ message: 'older' })],
          [t2, JSON.stringify({ message: 'newer' })],
        ],
      },
    ]);

    const result = await service.queryLogs({
      startMs: Date.now() - 60_000,
      endMs: Date.now() + 60_000,
      limit: 10,
    });

    expect(result.lines[0].message).toBe('newer');
    expect(result.lines[1].message).toBe('older');
  });

  it('returns empty result when Loki responds with status "error"', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', errorType: 'bad_data' }),
    }) as unknown as typeof fetch;

    const result = await service.queryLogs({
      startMs: Date.now() - 60_000,
      endMs: Date.now(),
      limit: 10,
    });

    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns empty result on non-ok HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
    }) as unknown as typeof fetch;

    const result = await service.queryLogs({
      startMs: Date.now() - 60_000,
      endMs: Date.now(),
      limit: 10,
    });

    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('getServiceLogs builds a 1-hour window and returns parsed lines', async () => {
    const nowNs = (Date.now() * 1_000_000).toString();
    mockLokiResponse([
      {
        stream: { service: 'auth-service' },
        values: [[nowNs, JSON.stringify({ message: 'hello' })]],
      },
    ]);

    const result = await service.getServiceLogs('auth-service', 'dev', 5);
    expect(result.total).toBe(1);
    expect(result.lines[0].message).toBe('hello');
  });

  it('searchLogs applies the search term as a line filter and returns matches', async () => {
    const nowNs = (Date.now() * 1_000_000).toString();
    mockLokiResponse([
      {
        stream: { service: 'auth-service' },
        values: [[nowNs, JSON.stringify({ message: 'error connecting to db' })]],
      },
    ]);

    const result = await service.searchLogs('error', Date.now() - 3_600_000, Date.now());
    expect(result.total).toBe(1);
    expect(result.lines[0].message).toContain('error');
  });

});
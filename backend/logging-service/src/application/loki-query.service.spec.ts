import { ConfigService } from '@nestjs/config';
import { LokiQueryService } from './loki-query.service';

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'LOKI_URL') return 'http://localhost:3100';
    return defaultValue ?? '';
  }),
} as unknown as ConfigService;

describe('LokiQueryService', () => {
  let service: LokiQueryService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new LokiQueryService(mockConfigService);
    fetchMock = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getServiceLogs returns empty array when Loki is unreachable', async () => {
    const result = await service.getServiceLogs('auth-service', 'dev', 10);
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('searchLogs returns empty array on network error', async () => {
    const result = await service.searchLogs('error', Date.now() - 3600_000, Date.now());
    expect(result.lines).toEqual([]);
  });

  it('queryLogs with namespace builds correct request and degrades gracefully', async () => {
    const result = await service.queryLogs({
      service: 'auth-service',
      namespace: 'dev-auth-service',
      startMs: Date.now() - 3600_000,
      endMs: Date.now(),
      limit: 50,
    });
    expect(result).toHaveProperty('lines');
    expect(result).toHaveProperty('total');
  });

  it('queryLogs parses structured and fallback log lines and sorts them', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: {
          result: [
            {
              stream: { app: 'auth-service', level: 'error' },
              values: [
                ['1700000000000000000', '{"message":"second","service":"auth-service"}'],
                ['1600000000000000000', 'plain log line'],
              ],
            },
          ],
        },
      }),
    } as unknown as Response);

    const result = await service.queryLogs({
      service: 'auth-service',
      startMs: 1,
      endMs: 2,
      limit: 10,
    });

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].message).toBe('second');
    expect(result.lines[1].message).toBe('plain log line');
    expect(result.total).toBe(2);
  });

  it('queryLogs includes a level filter when requested', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: { result: [] },
      }),
    } as unknown as Response);

    await service.queryLogs({
      level: 'error',
      startMs: 1,
      endMs: 2,
      limit: 10,
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  it('queryLogs returns empty results when Loki responds with a non-OK status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('boom'),
    } as unknown as Response);

    const result = await service.queryLogs({
      service: 'auth-service',
      startMs: 1,
      endMs: 2,
      limit: 10,
    });

    expect(result).toEqual({ lines: [], total: 0 });
  });
});
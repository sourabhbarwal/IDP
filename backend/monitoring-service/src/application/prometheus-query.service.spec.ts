import { ConfigService } from '@nestjs/config';
import { PrometheusQueryService, type PrometheusQueryResponse } from './prometheus-query.service';

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'PROMETHEUS_URL') return 'http://localhost:9090';
    return defaultValue ?? '';
  }),
} as unknown as ConfigService;

describe('PrometheusQueryService', () => {
  let service: PrometheusQueryService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new PrometheusQueryService(mockConfigService);
    fetchMock = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queryInstant returns parsed data when Prometheus responds successfully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: {
          resultType: 'vector',
          result: [{ metric: {}, value: [1, '2.5'] }],
        },
      }),
    } as unknown as Response);

    const result = await service.queryInstant('up');

    expect(result.resultType).toBe('vector');
    expect(result.result).toHaveLength(1);
  });

  it('queryInstant rejects when Prometheus returns a non-success response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('bad gateway'),
    } as unknown as Response);

    await expect(service.queryInstant('up')).rejects.toThrow('Failed to query Prometheus');
  });

  it('queryRange returns parsed data when range query succeeds', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [{ metric: {}, values: [[1, '3.0']] }],
        },
      }),
    } as unknown as Response);

    const result = await service.queryRange('up', 0, 1000);

    expect(result.resultType).toBe('matrix');
    expect(result.result).toHaveLength(1);
  });

  it('queryInstant throws when Prometheus reports an error payload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'error',
        errorType: 'bad_data',
      }),
    } as unknown as Response);

    await expect(service.queryInstant('up')).rejects.toThrow('Failed to query Prometheus');
  });

  it('queryRange throws when Prometheus returns a non-OK response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('bad gateway'),
    } as unknown as Response);

    await expect(service.queryRange('up', 0, 1000)).rejects.toThrow('Failed to query Prometheus');
  });

  it('getServiceMetrics handles rejected, empty, and vector results', async () => {
    jest.spyOn(service, 'queryInstant')
      .mockRejectedValueOnce(new Error('prometheus down'))
      .mockResolvedValueOnce({
        resultType: 'matrix',
        result: [],
      } as PrometheusQueryResponse)
      .mockResolvedValueOnce({
        resultType: 'vector',
        result: [{ metric: {}, value: [1, '12.3'] }],
      } as PrometheusQueryResponse);

    const result = await service.getServiceMetrics('auth-service', 'dev-auth-service');

    expect(result.requestRate).toBe(0);
    expect(result.errorRate).toBe(0);
    expect(result.p95LatencyMs).toBe(12.3);
    expect(result.service).toBe('auth-service');
    expect(result.namespace).toBe('dev-auth-service');
  });

  it('getAllServicesMetrics returns the fulfilled metrics for all discovered services', async () => {
    jest.spyOn(service, 'queryInstant').mockResolvedValue({
      resultType: 'vector',
      result: [
        { metric: { job: 'auth-service' }, value: [1, '1'] },
        { metric: { job: 'service-catalog-service' }, value: [1, '1'] },
        { metric: { job: 'repository-service' }, value: [1, '1'] },
        { metric: { job: 'template-service' }, value: [1, '1'] },
        { metric: { job: 'deployment-service' }, value: [1, '1'] },
        { metric: { job: 'prometheus' }, value: [1, '1'] },
      ],
    } as PrometheusQueryResponse);

    jest.spyOn(service, 'getServiceMetrics').mockImplementation(async (serviceName, namespace) => ({
      service: serviceName,
      namespace,
      requestRate: 1,
      errorRate: 0,
      p95LatencyMs: 2,
      memoryUsageBytes: 3,
      cpuUsageCores: 4,
      readyReplicas: 5,
    }));

    const results = await service.getAllServicesMetrics();

    // "prometheus" itself is excluded by discoverServiceJobs()
    expect(results).toHaveLength(5);
    expect(results.map((r) => r.service).sort()).toEqual([
      'auth-service',
      'deployment-service',
      'repository-service',
      'service-catalog-service',
      'template-service',
    ]);
  });

  it('discoverServiceJobs returns an empty list when Prometheus is unreachable', async () => {
    jest.spyOn(service, 'queryInstant').mockRejectedValue(new Error('prometheus down'));

    const results = await service.getAllServicesMetrics();

    expect(results).toHaveLength(0);
  });
});
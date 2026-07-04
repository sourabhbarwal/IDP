import { AuditQueryService } from './audit-query.service';
import { AuditEntry } from '../domain/entities/audit-entry.entity';

const mockDataSource = {
  query: jest.fn(),
};

describe('AuditQueryService', () => {
  let service: AuditQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditQueryService(mockDataSource as never);
  });

  it('returns empty result when all schema queries fail', async () => {
    mockDataSource.query.mockRejectedValue(new Error('schema does not exist'));

    const result = await service.query({ page: 0, size: 20 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns mapped AuditEntry objects from query result', async () => {
    const row = {
      id: 'e-1', user_id: 'u-1', action: 'SERVICE_CREATE',
      resource_type: 'SERVICE', resource_id: 's-1',
      result: 'SUCCESS', ip_address: '127.0.0.1',
      metadata: { name: 'my-service' }, source_schema: 'catalog',
      created_at: '2024-01-01T00:00:00.000Z',
    };
    mockDataSource.query
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([row]);

    const result = await service.query({ sourceSchema: 'catalog', page: 0, size: 20 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBeInstanceOf(AuditEntry);
    expect(result.items[0].action).toBe('SERVICE_CREATE');
    expect(result.items[0].sourceSchema).toBe('catalog');
    expect(result.items[0].isSuccess()).toBe(true);
  });

  it('returns empty action summary when query fails', async () => {
    mockDataSource.query.mockRejectedValue(new Error('connection refused'));
    const result = await service.getActionSummary();
    expect(result).toEqual([]);
  });
  it('query() applies all optional filters and builds correct SQL', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([]);

    await service.query({
      userId: 'u-1',
      action: 'SERVICE_CREATE',
      resourceType: 'SERVICE',
      resourceId: 's-1',
      result: 'SUCCESS',
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-02T00:00:00Z'),
      page: 0,
      size: 20,
    });

    // Verify the WHERE clause actually contains all the filter fragments
    const dataQueryCall = mockDataSource.query.mock.calls[1][0] as string;
    expect(dataQueryCall).toContain("user_id = 'u-1'");
    expect(dataQueryCall).toContain("action = 'SERVICE_CREATE'");
    expect(dataQueryCall).toContain("resource_type = 'SERVICE'");
    expect(dataQueryCall).toContain("resource_id = 's-1'");
    expect(dataQueryCall).toContain("result = 'SUCCESS'");
    expect(dataQueryCall).toContain('created_at >=');
    expect(dataQueryCall).toContain('created_at <=');
  });

  it('query() with no sourceSchema queries across all default schemas', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([]);

    await service.query({ page: 0, size: 20 });

    const countQueryCall = mockDataSource.query.mock.calls[0][0] as string;
    // Should union across auth, catalog, repository, deployment, alert
    expect(countQueryCall).toContain('auth.audit_logs');
    expect(countQueryCall).toContain('catalog.audit_logs');
    expect(countQueryCall).toContain('alert.audit_logs');
  });

  it('getActionSummary returns mapped rows on success', async () => {
    mockDataSource.query.mockResolvedValueOnce([
      { action: 'SERVICE_CREATE', schema: 'catalog', count: '5' },
      { action: 'ALERT_ACKNOWLEDGE', schema: 'alert', count: '2' },
    ]);

    const result = await service.getActionSummary();

    expect(result).toEqual([
      { action: 'SERVICE_CREATE', schema: 'catalog', count: 5 },
      { action: 'ALERT_ACKNOWLEDGE', schema: 'alert', count: 2 },
    ]);
  });

  it('query() returns empty result gracefully when count query succeeds but returns no rows', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.query({ page: 0, size: 20 });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});
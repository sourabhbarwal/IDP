import { AuditEntry } from './audit-entry.entity';

function makeEntry(result: 'SUCCESS' | 'FAILURE' = 'SUCCESS'): AuditEntry {
  return new AuditEntry({
    id: 'e-1', userId: 'u-1', action: 'SERVICE_CREATE',
    resourceType: 'SERVICE', resourceId: 's-1',
    result, ipAddress: '127.0.0.1',
    metadata: { name: 'test' }, sourceSchema: 'catalog',
    createdAt: new Date(),
  });
}

describe('AuditEntry domain entity', () => {
  it('isSuccess() returns true for SUCCESS result', () => {
    expect(makeEntry('SUCCESS').isSuccess()).toBe(true);
  });

  it('isFailure() returns true for FAILURE result', () => {
    expect(makeEntry('FAILURE').isFailure()).toBe(true);
  });

  it('isSuccess() returns false for FAILURE result', () => {
    expect(makeEntry('FAILURE').isSuccess()).toBe(false);
  });

  it('constructs with all properties assigned', () => {
    const entry = makeEntry();
    expect(entry.action).toBe('SERVICE_CREATE');
    expect(entry.sourceSchema).toBe('catalog');
    expect(entry.userId).toBe('u-1');
  });
});
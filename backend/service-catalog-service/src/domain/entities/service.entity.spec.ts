import { Service } from './service.entity';
import { ServiceVersion } from './service-version.entity';
import { ServiceType } from '../enums/service-type.enum';
import { ServiceStatus } from '../enums/service-status.enum';

function makeService(overrides: Partial<ConstructorParameters<typeof Service>[0]> = {}): Service {
  return new Service({
    id: 's-1', name: 'my-service', description: null,
    type: ServiceType.NODEJS, status: ServiceStatus.ACTIVE,
    ownerId: 'u-1', ownerEmail: 'dev@example.com', team: 'platform',
    repositoryUrl: null, tags: [], versions: [],
    createdAt: new Date(), updatedAt: new Date(),
    createdBy: 'u-1', updatedBy: null,
    ...overrides,
  });
}

describe('Service domain entity', () => {
  it('isActive() returns true when status is ACTIVE', () => {
    expect(makeService({ status: ServiceStatus.ACTIVE }).isActive()).toBe(true);
  });

  it('isActive() returns false when status is DEPRECATED', () => {
    expect(makeService({ status: ServiceStatus.DEPRECATED }).isActive()).toBe(false);
  });

  it('isActive() returns false when status is ARCHIVED', () => {
    expect(makeService({ status: ServiceStatus.ARCHIVED }).isActive()).toBe(false);
  });

  it('latestVersion() returns null when no versions', () => {
    expect(makeService({ versions: [] }).latestVersion()).toBeNull();
  });

  it('latestVersion() returns the most recently created version', () => {
    const old = new ServiceVersion({
      id: 'v-1', serviceId: 's-1', version: '1.0.0', changelog: null,
      deployedAt: null, environment: null,
      createdAt: new Date('2024-01-01'), createdBy: 'u-1',
    });
    const recent = new ServiceVersion({
      id: 'v-2', serviceId: 's-1', version: '1.1.0', changelog: null,
      deployedAt: null, environment: null,
      createdAt: new Date('2024-06-01'), createdBy: 'u-1',
    });
    const service = makeService({ versions: [old, recent] });
    expect(service.latestVersion()?.version).toBe('1.1.0');
  });
});
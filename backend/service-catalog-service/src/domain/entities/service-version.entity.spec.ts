import { ServiceVersion } from './service-version.entity';

describe('ServiceVersion domain entity', () => {
  const makeVersion = (): ServiceVersion =>
    new ServiceVersion({
      id: 'v-1',
      serviceId: 's-1',
      version: '1.0.0',
      changelog: 'Initial release',
      deployedAt: new Date('2024-01-01'),
      environment: 'production',
      createdAt: new Date('2024-01-01'),
      createdBy: 'u-1',
    });

  it('constructs with all properties assigned', () => {
    const v = makeVersion();
    expect(v.id).toBe('v-1');
    expect(v.serviceId).toBe('s-1');
    expect(v.version).toBe('1.0.0');
    expect(v.changelog).toBe('Initial release');
    expect(v.environment).toBe('production');
    expect(v.createdBy).toBe('u-1');
  });

  it('allows null optional fields', () => {
    const v = new ServiceVersion({
      id: 'v-2',
      serviceId: 's-1',
      version: '1.1.0',
      changelog: null,
      deployedAt: null,
      environment: null,
      createdAt: new Date(),
      createdBy: 'u-1',
    });
    expect(v.changelog).toBeNull();
    expect(v.deployedAt).toBeNull();
    expect(v.environment).toBeNull();
  });
});
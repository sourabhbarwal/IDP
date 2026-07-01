import { Deployment } from './deployment.entity';
import { DeploymentStrategy } from '../enums/deployment-strategy.enum';
import { DeploymentStatus } from '../enums/deployment-status.enum';
import { EnvironmentName } from '../enums/environment-name.enum';

function makeDeployment(overrides: Partial<ConstructorParameters<typeof Deployment>[0]> = {}): Deployment {
  return new Deployment({
    id: 'd-1',
    serviceId: 's-1',
    serviceName: 'my-api',
    environment: EnvironmentName.DEVELOPMENT,
    namespace: 'dev-my-api',
    imageTag: 'abc123',
    strategy: DeploymentStrategy.ROLLING,
    status: DeploymentStatus.SUCCEEDED,
    previousImageTag: 'xyz789',
    replicas: 1,
    canaryWeight: null,
    errorMessage: null,
    triggeredBy: 'u-1',
    startedAt: new Date('2024-01-01T00:00:00Z'),
    completedAt: new Date('2024-01-01T00:01:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });
}

describe('Deployment domain entity', () => {
  it('isTerminal() returns true for SUCCEEDED', () => {
    expect(makeDeployment({ status: DeploymentStatus.SUCCEEDED }).isTerminal()).toBe(true);
  });

  it('isTerminal() returns true for FAILED', () => {
    expect(makeDeployment({ status: DeploymentStatus.FAILED }).isTerminal()).toBe(true);
  });

  it('isTerminal() returns true for ROLLED_BACK', () => {
    expect(makeDeployment({ status: DeploymentStatus.ROLLED_BACK }).isTerminal()).toBe(true);
  });

  it('isTerminal() returns false for IN_PROGRESS', () => {
    expect(makeDeployment({ status: DeploymentStatus.IN_PROGRESS }).isTerminal()).toBe(false);
  });

  it('canRollback() returns true when SUCCEEDED with a previous image', () => {
    const d = makeDeployment({ status: DeploymentStatus.SUCCEEDED, previousImageTag: 'xyz789' });
    expect(d.canRollback()).toBe(true);
  });

  it('canRollback() returns false when no previous image exists', () => {
    const d = makeDeployment({ status: DeploymentStatus.SUCCEEDED, previousImageTag: null });
    expect(d.canRollback()).toBe(false);
  });

  it('canRollback() returns false when not SUCCEEDED', () => {
    const d = makeDeployment({ status: DeploymentStatus.FAILED, previousImageTag: 'xyz789' });
    expect(d.canRollback()).toBe(false);
  });

  it('durationMs() computes elapsed time when completed', () => {
    const d = makeDeployment({
      startedAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: new Date('2024-01-01T00:01:30Z'),
    });
    expect(d.durationMs()).toBe(90_000);
  });

  it('durationMs() returns null when not yet completed', () => {
    const d = makeDeployment({ completedAt: null });
    expect(d.durationMs()).toBeNull();
  });
});
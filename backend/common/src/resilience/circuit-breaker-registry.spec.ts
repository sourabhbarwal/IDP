import { CircuitBreakerRegistry } from './circuit-breaker-registry';
import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => { registry = new CircuitBreakerRegistry(); });

  it('creates a new circuit breaker on first call', () => {
    const cb = registry.getOrCreate('test-service');
    expect(cb).toBeInstanceOf(CircuitBreaker);
    expect(cb.name).toBe('test-service');
  });

  it('returns the same instance on subsequent calls', () => {
    const cb1 = registry.getOrCreate('test-service');
    const cb2 = registry.getOrCreate('test-service');
    expect(cb1).toBe(cb2);
  });

  it('returns different instances for different names', () => {
    const cb1 = registry.getOrCreate('service-a');
    const cb2 = registry.getOrCreate('service-b');
    expect(cb1).not.toBe(cb2);
  });

  it('getAllMetrics() returns all registered breakers', () => {
    registry.getOrCreate('service-a');
    registry.getOrCreate('service-b');
    const metrics = registry.getAllMetrics();
    expect(metrics).toHaveLength(2);
    expect(metrics.map((m) => m.name)).toContain('service-a');
    expect(metrics.map((m) => m.name)).toContain('service-b');
  });

  it('reset() resets a specific breaker', async () => {
    const cb = registry.getOrCreate('service-a', 1);
    await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(cb.currentState).toBe('OPEN');

    registry.reset('service-a');
    expect(cb.currentState).toBe('CLOSED');
  });
});
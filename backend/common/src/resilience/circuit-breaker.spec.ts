import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

function makeBreaker(failureThreshold = 3, recoveryTimeMs = 100) {
  return new CircuitBreaker({ name: 'test', failureThreshold, recoveryTimeMs });
}

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    expect(makeBreaker().currentState).toBe('CLOSED');
  });

  it('passes through successful calls in CLOSED state', async () => {
    const cb = makeBreaker();
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(cb.currentState).toBe('CLOSED');
  });

  it('opens after failureThreshold consecutive failures', async () => {
    const cb = makeBreaker(3);
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await cb.execute(fail).catch(() => {});
    }

    expect(cb.currentState).toBe('OPEN');
  });

  it('throws CircuitOpenError immediately when OPEN', async () => {
    const cb = makeBreaker(1);
    await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    expect(cb.currentState).toBe('OPEN');
    await expect(cb.execute(() => Promise.resolve('ok')))
      .rejects.toThrow(CircuitOpenError);
  });

  it('transitions to HALF_OPEN after recoveryTimeMs', async () => {
    const cb = makeBreaker(1, 50);
    await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(cb.currentState).toBe('OPEN');

    await new Promise((r) => setTimeout(r, 60));

    // Next call triggers HALF_OPEN probe
    await cb.execute(() => Promise.resolve('probe')).catch(() => {});
    expect(cb.currentState).toBe('CLOSED'); // succeeded → closed
  });

  it('returns to OPEN if HALF_OPEN probe fails', async () => {
    const cb = makeBreaker(1, 50);
    await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    await new Promise((r) => setTimeout(r, 60));

    await cb.execute(() => Promise.reject(new Error('probe fail'))).catch(() => {});
    expect(cb.currentState).toBe('OPEN');
  });

  it('resets to CLOSED on reset()', async () => {
    const cb = makeBreaker(1);
    await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(cb.currentState).toBe('OPEN');

    cb.reset();
    expect(cb.currentState).toBe('CLOSED');
  });

  it('toMetrics() returns current state info', () => {
    const cb = makeBreaker(3);
    const m = cb.toMetrics();
    expect(m['state']).toBe('CLOSED');
    expect(m['name']).toBe('test');
    expect(m['threshold']).toBe(3);
  });
});
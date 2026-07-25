import { applySecurity, THROTTLE_CONFIG_GLOBAL, THROTTLE_CONFIG_AUTH } from '@idp/common';

interface ThrottlerEntry {
  name: string;
  limit: number;
  ttl: number;
}

function getThrottler(config: typeof THROTTLE_CONFIG_GLOBAL, name: string): ThrottlerEntry | undefined {
  const throttlers = config as unknown as ThrottlerEntry[];
  return throttlers.find((t) => t.name === name);
}

describe('applySecurity', () => {
  it('is exported and is a function', () => {
    expect(typeof applySecurity).toBe('function');
  });

  it('accepts one argument (the NestJS app instance)', () => {
    expect(applySecurity.length).toBe(1);
  });
});

describe('THROTTLE_CONFIG_GLOBAL', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(THROTTLE_CONFIG_GLOBAL)).toBe(true);
    expect(THROTTLE_CONFIG_GLOBAL.length).toBeGreaterThan(0);
  });

  it('global throttler allows 100 requests per 15 minutes', () => {
    const global = getThrottler(THROTTLE_CONFIG_GLOBAL, 'global');
    expect(global).toBeDefined();
    expect(global?.limit).toBe(100);
    expect(global?.ttl).toBe(900_000);
  });
});

describe('THROTTLE_CONFIG_AUTH', () => {
  it('has both global and auth throttlers', () => {
    const throttlers = THROTTLE_CONFIG_AUTH as unknown as ThrottlerEntry[];
    const names = throttlers.map((t) => t.name);
    expect(names).toContain('global');
    expect(names).toContain('auth');
  });

  it('auth throttler limit is 10', () => {
    const auth = getThrottler(THROTTLE_CONFIG_AUTH, 'auth');
    expect(auth).toBeDefined();
    expect(auth?.limit).toBe(10);
  });

  it('global throttler limit is 100', () => {
    const global = getThrottler(THROTTLE_CONFIG_AUTH, 'global');
    expect(global).toBeDefined();
    expect(global?.limit).toBe(100);
  });

  it('auth throttler is stricter than global', () => {
    const auth = getThrottler(THROTTLE_CONFIG_AUTH, 'auth');
    const global = getThrottler(THROTTLE_CONFIG_AUTH, 'global');
    expect(auth?.limit ?? 999).toBeLessThan(global?.limit ?? 0);
  });
});
/**
 * Security configuration unit tests.
 * Tests the security utility functions directly without booting NestJS
 * or connecting to a database. This runs as part of the standard unit
 * test suite in CI.
 *
 * The actual header presence on HTTP responses is verified during
 * manual smoke testing and docker-compose health checks.
 */
import { applySecurity } from '@idp/common';
import { THROTTLE_CONFIG_GLOBAL, THROTTLE_CONFIG_AUTH } from '@idp/common';

describe('applySecurity', () => {
  it('is exported and is a function', () => {
    expect(typeof applySecurity).toBe('function');
  });

  it('accepts one argument (the NestJS app instance)', () => {
    expect(applySecurity.length).toBe(1);
  });
});

describe('THROTTLE_CONFIG_GLOBAL', () => {
  it('has a throttlers array', () => {
    expect(Array.isArray(THROTTLE_CONFIG_GLOBAL.throttlers)).toBe(true);
    expect(THROTTLE_CONFIG_GLOBAL.throttlers!.length).toBeGreaterThan(0);
  });

  it('global throttler allows 100 requests per 15 minutes', () => {
    const throttlers = THROTTLE_CONFIG_GLOBAL.throttlers as Array<{
      name: string; limit: number; ttl: number;
    }>;
    const global = throttlers.find((t) => t.name === 'global');
    expect(global).toBeDefined();
    expect(global!.limit).toBe(100);
    expect(global!.ttl).toBe(900_000);
  });
});

describe('THROTTLE_CONFIG_AUTH', () => {
  it('has both global and auth throttlers', () => {
    const throttlers = THROTTLE_CONFIG_AUTH.throttlers as Array<{
      name: string; limit: number; ttl: number;
    }>;
    const names = throttlers.map((t) => t.name);
    expect(names).toContain('global');
    expect(names).toContain('auth');
  });

  it('auth throttler is stricter than global (10 vs 100)', () => {
    const throttlers = THROTTLE_CONFIG_AUTH.throttlers as Array<{
      name: string; limit: number; ttl: number;
    }>;
    const auth = throttlers.find((t) => t.name === 'auth');
    const global = throttlers.find((t) => t.name === 'global');
    expect(auth!.limit).toBe(10);
    expect(global!.limit).toBe(100);
    expect(auth!.limit).toBeLessThan(global!.limit);
  });
});
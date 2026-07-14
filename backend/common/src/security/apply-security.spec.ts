import { applySecurity } from './apply-security';
import { THROTTLE_CONFIG_GLOBAL, THROTTLE_CONFIG_AUTH } from './throttler.config';

describe('applySecurity', () => {
  it('is a function that accepts an app instance', () => {
    expect(typeof applySecurity).toBe('function');
    expect(applySecurity.length).toBe(1);
  });

  it('registers helmet and body-parsing middleware on the app', () => {
    const useSpy = jest.fn();
    const mockApp = { use: useSpy } as unknown as Parameters<typeof applySecurity>[0];

    applySecurity(mockApp);

    // helmet() + express.json() + express.urlencoded() = 3 calls to app.use()
    expect(useSpy).toHaveBeenCalledTimes(3);

    // Each call should have been given a middleware function
    useSpy.mock.calls.forEach((call) => {
      expect(typeof call[0]).toBe('function');
    });
  });

  it('does not throw when called with a minimal app mock', () => {
    const mockApp = { use: jest.fn() } as unknown as Parameters<typeof applySecurity>[0];
    expect(() => applySecurity(mockApp)).not.toThrow();
  });
});

describe('THROTTLE_CONFIG_GLOBAL', () => {
  it('has throttlers array with at least one entry', () => {
    expect(Array.isArray(THROTTLE_CONFIG_GLOBAL.throttlers)).toBe(true);
    expect(THROTTLE_CONFIG_GLOBAL.throttlers.length).toBeGreaterThan(0);
  });

  it('global throttler allows 100 requests per 15 minutes', () => {
    const global = THROTTLE_CONFIG_GLOBAL.throttlers.find((t) => t.name === 'global');
    expect(global).toBeDefined();
    expect(global!.limit).toBe(100);
    expect(global!.ttl).toBe(900_000);
  });
});

describe('THROTTLE_CONFIG_AUTH', () => {
  it('auth throttler has stricter limit than global', () => {
    const auth = THROTTLE_CONFIG_AUTH.throttlers.find((t) => t.name === 'auth');
    const global = THROTTLE_CONFIG_AUTH.throttlers.find((t) => t.name === 'global');
    expect(auth).toBeDefined();
    expect(global).toBeDefined();
    expect(auth!.limit).toBeLessThan(global!.limit);
  });

  it('auth limit is 10 requests per 15 minutes', () => {
    const auth = THROTTLE_CONFIG_AUTH.throttlers.find((t) => t.name === 'auth');
    expect(auth!.limit).toBe(10);
  });
});
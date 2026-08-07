import { withRetry, RetryableError } from './retry';

describe('withRetry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error and succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxAttempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    promise.catch(() => {}); // prevent unhandled rejection warning while timers advance

    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on client errors (404)', async () => {
    const fn = jest.fn().mockRejectedValue(new RetryableError('Not found', 404));

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, noRetryStatuses: [404] }),
    ).rejects.toThrow('Not found');

    expect(fn).toHaveBeenCalledTimes(1); // No retry
  });
});
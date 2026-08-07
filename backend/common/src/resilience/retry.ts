export interface RetryOptions {
  /** Maximum total attempts (including first try) */
  maxAttempts: number;
  /** Base delay in ms (doubles each attempt) */
  baseDelayMs: number;
  /** HTTP status codes that should NOT be retried (client errors) */
  noRetryStatuses: number[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts:     3,
  baseDelayMs:     100,
  noRetryStatuses: [400, 401, 403, 404, 409, 422],
};

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Executes fn() with exponential backoff retry.
 *
 * Retries on:
 *   - Network errors (fetch failed, AbortError from timeout)
 *   - HTTP 429, 502, 503, 504
 *
 * Does NOT retry on:
 *   - HTTP 400, 401, 403, 404, 409 (client errors — retrying won't help)
 *   - Any error with a status in noRetryStatuses
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry client errors
      if (error instanceof RetryableError && error.statusCode) {
        if (opts.noRetryStatuses.includes(error.statusCode)) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) break;

      // Exponential backoff: 100ms, 200ms, 400ms...
      const delay = opts.baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Retry failed with unknown error');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
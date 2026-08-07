import { CircuitBreaker} from './circuit-breaker';
import { withRetry, RetryableError } from './retry';

export interface ResilientFetchOptions {
  timeoutMs?:  number;
  maxAttempts?: number;
  circuit?:    CircuitBreaker;
}

const RETRY_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Drop-in replacement for fetch() with timeout, retry, and circuit breaker.
 *
 * Usage:
 *   // Simple — just adds timeout and retry
 *   const res = await resilientFetch('http://cost-service:3011/api/v1/cost/summary');
 *
 *   // With circuit breaker (reuse the same CB instance across calls)
 *   const cb = new CircuitBreaker({ name: 'cost-service', failureThreshold: 5 });
 *   const res = await resilientFetch(url, {}, { circuit: cb });
 */
export async function resilientFetch(
  url: string,
  init: RequestInit = {},
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const timeoutMs  = options.timeoutMs  ?? 5_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const circuit    = options.circuit;

  const doFetch = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      // Throw retryable error for server errors so retry logic kicks in
      if (RETRY_STATUSES.has(response.status)) {
        throw new RetryableError(
          `HTTP ${response.status} from ${url}`,
          response.status,
        );
      }

      return response;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new RetryableError(`Request to ${url} timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const withRetryFetch = () => withRetry(doFetch, { maxAttempts });

  if (circuit) {
    return circuit.execute(withRetryFetch);
  }

  return withRetryFetch();
}
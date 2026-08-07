export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening */
  failureThreshold: number;
  /** How long (ms) to keep circuit open before allowing a probe */
  recoveryTimeMs: number;
  /** Name used in logs and metrics */
  name: string;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  recoveryTimeMs:   30_000,
  name:             'unnamed',
};

/**
 * Simple three-state circuit breaker.
 *
 * CLOSED   — normal operation, requests pass through
 * OPEN     — failure threshold exceeded, requests fail immediately (fail-fast)
 * HALF_OPEN — one probe request allowed after recovery time
 *
 * Usage:
 *   const cb = new CircuitBreaker({ name: 'cost-service', failureThreshold: 5 })
 *   const result = await cb.execute(() => fetch('http://cost-service:3011/...'))
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get currentState(): CircuitState {
    return this.state;
  }

  get name(): string {
    return this.options.name;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure >= this.options.recoveryTimeMs) {
        // Transition to HALF_OPEN — allow one probe request
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitOpenError(
          `Circuit '${this.options.name}' is OPEN. ` +
          `Retry in ${Math.ceil((this.options.recoveryTimeMs - timeSinceLastFailure) / 1000)}s`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.state === 'HALF_OPEN' ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.state = 'OPEN';
    }
  }

  /** Reset to CLOSED state (e.g. for testing or manual recovery) */
  reset(): void {
    this.state   = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  toMetrics(): Record<string, unknown> {
    return {
      name:         this.options.name,
      state:        this.state,
      failureCount: this.failureCount,
      threshold:    this.options.failureThreshold,
    };
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
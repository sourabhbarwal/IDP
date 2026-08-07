import { Injectable } from '@nestjs/common';
import { CircuitBreaker, CircuitState } from './circuit-breaker';

/**
 * Singleton registry of circuit breakers per service.
 * Inject this as a provider and use getOrCreate() to get
 * a CB for a specific downstream service.
 *
 * This ensures the same CB instance is reused across all
 * calls to the same downstream (CB state is shared).
 */
@Injectable()
export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  getOrCreate(name: string, failureThreshold = 5, recoveryTimeMs = 30_000): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, failureThreshold, recoveryTimeMs }));
    }
    return this.breakers.get(name)!;
  }

  getAllMetrics(): Array<{
    name: string;
    state: CircuitState;
    failureCount: number;
    threshold: number;
  }> {
    return Array.from(this.breakers.values()).map((cb) =>
      cb.toMetrics() as ReturnType<typeof this.getAllMetrics>[0],
    );
  }

  reset(name: string): void {
    this.breakers.get(name)?.reset();
  }
}
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk: NodeSDK | null = null;

/**
 * Initialise OpenTelemetry tracing.
 * Must be called BEFORE NestJS bootstraps (before any imports that
 * create HTTP servers, database connections, etc.)
 *
 * Usage in main.ts:
 *   import { initTracing } from '@idp/common';
 *   initTracing('auth-service');
 *   // ... then create NestJS app
 */
export function initTracing(serviceName: string, serviceVersion = '0.1.0'): void {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    'http://otel-collector:4317';

  // Skip tracing in test environment
  if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: otlpEndpoint,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Instrument HTTP (Express routes → NestJS controllers)
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          // Skip health check spans — too noisy
          ignoreIncomingRequestHook: (req) =>
            req.url === '/health' || req.url === '/health/ready',
        },
        // Instrument PostgreSQL queries
        '@opentelemetry/instrumentation-pg': { enabled: true },
        // Instrument Redis
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
        // DNS and net are too low-level — skip
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk?.shutdown().catch(console.error);
  });

  console.log(`[Tracing] Initialised for ${serviceName} → ${otlpEndpoint}`);
}

export function shutdownTracing(): Promise<void> {
  return sdk?.shutdown() ?? Promise.resolve();
}
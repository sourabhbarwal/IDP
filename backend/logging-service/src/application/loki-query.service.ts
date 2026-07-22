import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogLine {
  timestamp: string;
  message: string;
  level?: string;
  service?: string;
  labels: Record<string, string>;
}

export interface LogQueryResult {
  lines: LogLine[];
  total: number;
}

/**
 * Queries Loki for IDP Platform service logs.
 *
 * Label mapping (must match what Promtail ships):
 *   service   = Docker Compose service name (e.g. "auth-service")
 *   container = Docker container name       (e.g. "idp-auth-service")
 *   level     = parsed from JSON log field  (e.g. "info", "error")
 *   compose_project = "idp"
 */
@Injectable()
export class LokiQueryService {
  private readonly logger = new Logger(LokiQueryService.name);
  private readonly lokiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.lokiUrl = config.get<string>('LOKI_URL', 'http://loki:3100');
  }

  async queryLogs(params: {
    service?: string;
    level?: string;
    search?: string;
    startMs: number;
    endMs: number;
    limit?: number;
  }): Promise<LogQueryResult> {
    const labelMatchers: string[] = [];

    // Always scope to IDP project only
    labelMatchers.push(`compose_project="idp"`);

    // service = Compose service name (e.g. "auth-service")
    if (params.service) {
      labelMatchers.push(`service="${params.service}"`);
    }

    // level = parsed log level
    if (params.level) {
      labelMatchers.push(`level="${params.level}"`);
    }

    let logql = `{${labelMatchers.join(',')}}`;

    // Add line filter for search text
    if (params.search) {
      logql += ` |= \`${params.search}\``;
    }

    // Try to parse JSON — NestJS logs are JSON by default
    logql += ' | json';

    // Loki expects nanoseconds for start/end
    const startNs = (params.startMs * 1_000_000).toString();
    const endNs   = (params.endMs   * 1_000_000).toString();

    const url = new URL(`${this.lokiUrl}/loki/api/v1/query_range`);
    url.searchParams.set('query',     logql);
    url.searchParams.set('start',     startNs);
    url.searchParams.set('end',       endNs);
    url.searchParams.set('limit',     String(params.limit ?? 100));
    url.searchParams.set('direction', 'backward');

    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Loki returned ${response.status}: ${body}`);
        return { lines: [], total: 0 };
      }

      const json = await response.json() as {
        status: string;
        data: {
          result: Array<{
            stream: Record<string, string>;
            values: Array<[string, string]>;
          }>;
        };
      };

      if (json.status !== 'success') {
        this.logger.error(`Loki query failed: ${JSON.stringify(json)}`);
        return { lines: [], total: 0 };
      }

      const lines: LogLine[] = [];

      for (const stream of json.data.result) {
        for (const [tsNs, rawLine] of stream.values) {
          // Convert nanoseconds to milliseconds for Date
          const tsMs = Math.floor(Number(tsNs) / 1_000_000);

          let parsed: Record<string, string> = {};
          try {
            parsed = JSON.parse(rawLine) as Record<string, string>;
          } catch {
            parsed = { message: rawLine };
          }

          lines.push({
            timestamp: new Date(tsMs).toISOString(),
            message:   parsed['message'] ?? parsed['msg'] ?? rawLine,
            level:     parsed['level']   ?? stream.stream['level'],
            service:   parsed['service'] ?? stream.stream['service'],
            labels:    stream.stream,
          });
        }
      }

      // Sort newest first
      lines.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return { lines, total: lines.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Loki query failed: ${message}`);
      return { lines: [], total: 0 };
    }
  }

  /**
   * Get recent logs for a specific service by its Compose service name.
   * e.g. getServiceLogs('auth-service') queries label service="auth-service"
   */
  async getServiceLogs(
    service: string,
    _environment = 'dev',  // kept for API compat but not used in Docker Compose labels
    limit = 100,
  ): Promise<LogQueryResult> {
    const end   = Date.now();
    const start = end - 60 * 60 * 1000; // last 1 hour
    return this.queryLogs({ service, startMs: start, endMs: end, limit });
  }

  async searchLogs(
    query: string,
    startMs: number,
    endMs: number,
    limit = 100,
  ): Promise<LogQueryResult> {
    return this.queryLogs({ search: query, startMs, endMs, limit });
  }
}
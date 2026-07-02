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
 * Translates service-aware parameters into LogQL queries.
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
    namespace?: string;
    level?: string;
    search?: string;
    startMs: number;
    endMs: number;
    limit?: number;
  }): Promise<LogQueryResult> {
    const labelMatchers: string[] = [];

    if (params.namespace) {
      labelMatchers.push(`namespace="${params.namespace}"`);
    }
    if (params.service) {
      labelMatchers.push(`app="${params.service}"`);
    }
    if (params.level) {
      labelMatchers.push(`level="${params.level}"`);
    }

    let logql = `{${labelMatchers.join(',')}}`;

    // Add line filter for search text
    if (params.search) {
      logql += ` |= \`${params.search}\``;
    }

    // Parse JSON log lines for structured field extraction
    logql += ' | json';

    const url = new URL(`${this.lokiUrl}/loki/api/v1/query_range`);
    url.searchParams.set('query', logql);
    url.searchParams.set('start', (params.startMs * 1_000_000).toString()); // nanoseconds
    url.searchParams.set('end', (params.endMs * 1_000_000).toString());
    url.searchParams.set('limit', String(params.limit ?? 100));
    url.searchParams.set('direction', 'backward');

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Loki returned ${response.status}: ${await response.text()}`);
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

      const lines: LogLine[] = [];

      for (const stream of json.data.result) {
        for (const [ts, rawLine] of stream.values) {
          let parsed: Record<string, string> = {};
          try {
            parsed = JSON.parse(rawLine) as Record<string, string>;
          } catch {
            parsed = { message: rawLine };
          }

          lines.push({
            timestamp: new Date(Math.floor(Number(ts) / 1_000_000)).toISOString(),
            message: parsed['message'] ?? parsed['msg'] ?? rawLine,
            level: parsed['level'] ?? stream.stream['level'],
            service: parsed['service'] ?? stream.stream['app'],
            labels: stream.stream,
          });
        }
      }

      // Sort newest first (Loki returns them stream-by-stream)
      lines.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return { lines, total: lines.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Loki query failed: ${message}`);
      // Return empty on error so the UI degrades gracefully
      return { lines: [], total: 0 };
    }
  }

  async getServiceLogs(service: string, environment = 'dev', limit = 100): Promise<LogQueryResult> {
    const namespace = `${environment}-${service}`;
    const end = Date.now();
    const start = end - 60 * 60 * 1000; // last 1 hour

    return this.queryLogs({ service, namespace, startMs: start, endMs: end, limit });
  }

  async searchLogs(query: string, startMs: number, endMs: number, limit = 100): Promise<LogQueryResult> {
    return this.queryLogs({ search: query, startMs, endMs, limit });
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { Observable, switchMap, from} from 'rxjs';
import { CopilotMode } from '../domain/enums/copilot-mode.enum';
import { ConversationMessage } from '../domain/entities/conversation-message.entity';
import { CopilotResponse } from '../domain/entities/copilot-response.entity';
import { GroqClientService, GroqStreamChunk } from './groq-client.service';
import { PlatformContextService } from './platform-context.service';
import { SYSTEM_PROMPTS } from './system-prompts';
import { randomUUID } from 'crypto';

export interface CopilotRequest {
  mode: CopilotMode;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  serviceName?: string;
  bearerToken: string;
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly groq: GroqClientService,
    private readonly platformContext: PlatformContextService,
  ) {}

  // ── Non-streaming (kept for backward compat) ──────────────────────────────

  async chat(request: CopilotRequest): Promise<CopilotResponse> {
    const { systemPrompt, contextUsed } = await this.buildSystemPrompt(request);
    const messages = this.buildMessages(systemPrompt, request);
    const result = await this.groq.complete(messages);

    return new CopilotResponse({
      id: randomUUID(),
      mode: request.mode,
      content: result.content,
      contextUsed,
      tokensUsed: result.tokensUsed,
      modelUsed: result.model,
      durationMs: result.durationMs,
      createdAt: new Date(),
    });
  }

  // ── Streaming — returns Observable<GroqStreamChunk> ───────────────────────

  /**
   * Streams the AI response token by token.
   *
   * First fetches platform context (if needed for the mode), then
   * opens a streaming connection to Groq and emits chunks as they arrive.
   *
   * The first emitted event is always a special 'context' event
   * telling the client which data sources were queried.
   */
  streamChat(request: CopilotRequest): Observable<GroqStreamChunk & { contextUsed?: string[] }> {
    return from(this.buildSystemPrompt(request)).pipe(
      switchMap(({ systemPrompt, contextUsed }) => {
        const messages = this.buildMessages(systemPrompt, request);

        // Prepend a context event so frontend knows what data was fetched
        const contextEvent: GroqStreamChunk & { contextUsed?: string[] } = {
          type: 'delta',
          content: '',
          contextUsed,
        };

        return new Observable<GroqStreamChunk & { contextUsed?: string[] }>((observer) => {
          // Emit context event first
          observer.next(contextEvent);

          // Then subscribe to the token stream
          const subscription = this.groq.stream(messages).subscribe({
            next: (chunk) => observer.next(chunk),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });

          return () => subscription.unsubscribe();
        });
      }),
    );
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private buildMessages(systemPrompt: string, request: CopilotRequest) {
    return [
      ConversationMessage.system(systemPrompt),
      ...request.history.map(
        (h) => new ConversationMessage({ role: h.role, content: h.content, timestamp: new Date() }),
      ),
      ConversationMessage.user(request.message),
    ].map((m) => m.toGroqMessage());
  }

  private async buildSystemPrompt(
    request: CopilotRequest,
  ): Promise<{ systemPrompt: string; contextUsed: string[] }> {
    switch (request.mode) {
      case CopilotMode.CHAT:
        return { systemPrompt: SYSTEM_PROMPTS.CHAT, contextUsed: [] };

      case CopilotMode.INCIDENT: {
        this.logger.log('Fetching live alert + metrics context');
        let alertsJson = '[]';
        let metricsJson = '[]';
        const sources: string[] = [];

        try {
          const { alerts } = await this.platformContext.gatherAlertContext(request.bearerToken);
          alertsJson = JSON.stringify(alerts, null, 2);
          sources.push('alert-service');
        } catch (err) {
          this.logger.warn(`Could not fetch alerts: ${err}`);
        }

        try {
          const ctx = await this.platformContext.gatherFullContext(request.bearerToken);
          metricsJson = JSON.stringify(ctx.servicesMetrics, null, 2);
          if (ctx.sources.includes('monitoring-service')) sources.push('monitoring-service');
        } catch (err) {
          this.logger.warn(`Could not fetch metrics: ${err}`);
        }

        return {
          systemPrompt: SYSTEM_PROMPTS.INCIDENT(alertsJson, metricsJson),
          contextUsed: sources,
        };
      }

      case CopilotMode.COST: {
        this.logger.log('Fetching live cost context');
        let costJson = 'null';
        let servicesJson = '[]';
        const sources: string[] = [];

        try {
          const { cost, services } = await this.platformContext.gatherCostContext(request.bearerToken);
          costJson = JSON.stringify(cost, null, 2);
          servicesJson = JSON.stringify(services, null, 2);
          sources.push('cost-service (summary)', 'cost-service (per-service)');
        } catch (err) {
          this.logger.warn(`Could not fetch cost data: ${err}`);
        }

        return {
          systemPrompt: SYSTEM_PROMPTS.COST(costJson, servicesJson),
          contextUsed: sources,
        };
      }

      case CopilotMode.DEPLOYMENT: {
        const serviceName = request.serviceName ?? 'unknown-service';
        this.logger.log(`Fetching metrics for deployment advisory: ${serviceName}`);
        let metricsJson = '{}';
        const sources: string[] = [];

        try {
          const ctx = await this.platformContext.gatherFullContext(request.bearerToken);
          const svcMetrics = (ctx.servicesMetrics as Array<{ service: string }>)
            .find((s) => s.service === serviceName);
          metricsJson = JSON.stringify(svcMetrics ?? {}, null, 2);
          if (ctx.sources.includes('monitoring-service')) sources.push('monitoring-service');
        } catch (err) {
          this.logger.warn(`Could not fetch metrics: ${err}`);
        }

        return {
          systemPrompt: SYSTEM_PROMPTS.DEPLOYMENT(serviceName, metricsJson),
          contextUsed: sources,
        };
      }
    }
  }
}
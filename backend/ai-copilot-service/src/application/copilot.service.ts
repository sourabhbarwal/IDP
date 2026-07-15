import { Injectable, Logger } from '@nestjs/common';
import { CopilotMode } from '../domain/enums/copilot-mode.enum';
import { ConversationMessage } from '../domain/entities/conversation-message.entity';
import { CopilotResponse } from '../domain/entities/copilot-response.entity';
import { GroqClientService } from './groq-client.service';
import { PlatformContextService } from './platform-context.service';
import { SYSTEM_PROMPTS } from './system-prompts';
import { randomUUID } from 'crypto';

export interface CopilotRequest {
  mode: CopilotMode;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  serviceName?: string;  // for DEPLOYMENT mode
  bearerToken: string;   // forwarded to internal service calls
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly groq: GroqClientService,
    private readonly platformContext: PlatformContextService,
  ) {}

  async chat(request: CopilotRequest): Promise<CopilotResponse> {
    switch (request.mode) {
      case CopilotMode.CHAT:
        return this.handleChat(request);
      case CopilotMode.INCIDENT:
        return this.handleIncident(request);
      case CopilotMode.COST:
        return this.handleCost(request);
      case CopilotMode.DEPLOYMENT:
        return this.handleDeployment(request);
    }
  }

  // ── Mode handlers ─────────────────────────────────────────────────────────

  private async handleChat(request: CopilotRequest): Promise<CopilotResponse> {
    const messages = [
      ConversationMessage.system(SYSTEM_PROMPTS.CHAT),
      ...request.history.map((h) =>
        new ConversationMessage({ role: h.role, content: h.content, timestamp: new Date() }),
      ),
      ConversationMessage.user(request.message),
    ];

    const result = await this.groq.complete(messages.map((m) => m.toGroqMessage()));

    return new CopilotResponse({
      id: randomUUID(),
      mode: CopilotMode.CHAT,
      content: result.content,
      contextUsed: [],
      tokensUsed: result.tokensUsed,
      modelUsed: result.model,
      durationMs: result.durationMs,
      createdAt: new Date(),
    });
  }

  private async handleIncident(request: CopilotRequest): Promise<CopilotResponse> {
    this.logger.log('Gathering alert + metrics context for incident investigation');

    const { alerts, sources: alertSources } = await this.platformContext.gatherAlertContext(
      request.bearerToken,
    );

    // Also try to get metrics for richer context
    let metrics: unknown[] = [];
    const metricsSources: string[] = [];
    try {
      const ctx = await this.platformContext.gatherFullContext(request.bearerToken);
      metrics = ctx.servicesMetrics;
      if (ctx.sources.includes('monitoring-service')) metricsSources.push('monitoring-service');
    } catch {
      // metrics are optional — proceed without them
    }

    const systemPrompt = SYSTEM_PROMPTS.INCIDENT(
      JSON.stringify(alerts, null, 2),
      JSON.stringify(metrics, null, 2),
    );

    const messages = [
      ConversationMessage.system(systemPrompt),
      ...request.history.map((h) =>
        new ConversationMessage({ role: h.role, content: h.content, timestamp: new Date() }),
      ),
      ConversationMessage.user(request.message),
    ];

    const result = await this.groq.complete(messages.map((m) => m.toGroqMessage()));

    return new CopilotResponse({
      id: randomUUID(),
      mode: CopilotMode.INCIDENT,
      content: result.content,
      contextUsed: [...alertSources, ...metricsSources],
      tokensUsed: result.tokensUsed,
      modelUsed: result.model,
      durationMs: result.durationMs,
      createdAt: new Date(),
    });
  }

  private async handleCost(request: CopilotRequest): Promise<CopilotResponse> {
    this.logger.log('Gathering cost context for cost advisor');

    const { cost, services, sources } = await this.platformContext.gatherCostContext(
      request.bearerToken,
    );

    const systemPrompt = SYSTEM_PROMPTS.COST(
      JSON.stringify(cost, null, 2),
      JSON.stringify(services, null, 2),
    );

    const messages = [
      ConversationMessage.system(systemPrompt),
      ...request.history.map((h) =>
        new ConversationMessage({ role: h.role, content: h.content, timestamp: new Date() }),
      ),
      ConversationMessage.user(request.message),
    ];

    const result = await this.groq.complete(messages.map((m) => m.toGroqMessage()));

    return new CopilotResponse({
      id: randomUUID(),
      mode: CopilotMode.COST,
      content: result.content,
      contextUsed: sources,
      tokensUsed: result.tokensUsed,
      modelUsed: result.model,
      durationMs: result.durationMs,
      createdAt: new Date(),
    });
  }

  private async handleDeployment(request: CopilotRequest): Promise<CopilotResponse> {
    const serviceName = request.serviceName ?? 'unknown-service';
    this.logger.log(`Gathering metrics context for deployment advisory: ${serviceName}`);

    let metrics = {};
    const sources: string[] = [];
    try {
      const ctx = await this.platformContext.gatherFullContext(request.bearerToken);
      const svcMetrics = (ctx.servicesMetrics as Array<{ service: string }>).find(
        (s) => s.service === serviceName,
      );
      metrics = svcMetrics ?? {};
      if (ctx.sources.includes('monitoring-service')) sources.push('monitoring-service');
    } catch (error) {
      this.logger.warn(
        `Deployment context gathering failed for ${serviceName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

    }

    const systemPrompt = SYSTEM_PROMPTS.DEPLOYMENT(serviceName, JSON.stringify(metrics, null, 2));

    const messages = [
      ConversationMessage.system(systemPrompt),
      ...request.history.map((h) =>
        new ConversationMessage({ role: h.role, content: h.content, timestamp: new Date() }),
      ),
      ConversationMessage.user(request.message),
    ];

    const result = await this.groq.complete(messages.map((m) => m.toGroqMessage()));

    return new CopilotResponse({
      id: randomUUID(),
      mode: CopilotMode.DEPLOYMENT,
      content: result.content,
      contextUsed: sources,
      tokensUsed: result.tokensUsed,
      modelUsed: result.model,
      durationMs: result.durationMs,
      createdAt: new Date(),
    });
  }
}
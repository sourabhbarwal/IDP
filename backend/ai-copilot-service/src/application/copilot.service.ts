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

  async chat(request: CopilotRequest): Promise<CopilotResponse> {
    switch (request.mode) {
      case CopilotMode.CHAT:      return this.handleChat(request);
      case CopilotMode.INCIDENT:  return this.handleIncident(request);
      case CopilotMode.COST:      return this.handleCost(request);
      case CopilotMode.DEPLOYMENT: return this.handleDeployment(request);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildMessages(systemPrompt: string, request: CopilotRequest) {
    return [
      ConversationMessage.system(systemPrompt),
      ...request.history.map((h) =>
        new ConversationMessage({ role: h.role, content: h.content, timestamp: new Date() }),
      ),
      ConversationMessage.user(request.message),
    ].map((m) => m.toGroqMessage());
  }

  private async handleChat(request: CopilotRequest): Promise<CopilotResponse> {
    const messages = this.buildMessages(SYSTEM_PROMPTS.CHAT, request);
    const result = await this.groq.complete(messages);

    return new CopilotResponse({
      id: randomUUID(), mode: CopilotMode.CHAT,
      content: result.content, contextUsed: [],
      tokensUsed: result.tokensUsed, modelUsed: result.model,
      durationMs: result.durationMs, createdAt: new Date(),
    });
  }

  private async handleIncident(request: CopilotRequest): Promise<CopilotResponse> {
    this.logger.log('Fetching live alert + metrics context for incident investigation');

    const sources: string[] = [];
    let alertsJson = '[]';
    let metricsJson = '[]';

    try {
      const { alerts } = await this.platformContext.gatherAlertContext(request.bearerToken);
      alertsJson = JSON.stringify(alerts, null, 2);
      sources.push('alert-service');
      this.logger.log(`Fetched ${alerts.length} active alerts`);
    } catch (err) {
      this.logger.warn(`Could not fetch alerts: ${err}`);
      alertsJson = '// Could not fetch — alert-service may be unavailable';
    }

    try {
      const ctx = await this.platformContext.gatherFullContext(request.bearerToken);
      metricsJson = JSON.stringify(ctx.servicesMetrics, null, 2);
      if (ctx.sources.includes('monitoring-service')) sources.push('monitoring-service');
      this.logger.log(`Fetched metrics for ${ctx.servicesMetrics.length} services`);
    } catch (err) {
      this.logger.warn(`Could not fetch metrics: ${err}`);
      metricsJson = '// Could not fetch — monitoring-service may be unavailable';
    }

    const messages = this.buildMessages(
      SYSTEM_PROMPTS.INCIDENT(alertsJson, metricsJson),
      request,
    );
    const result = await this.groq.complete(messages);

    return new CopilotResponse({
      id: randomUUID(), mode: CopilotMode.INCIDENT,
      content: result.content, contextUsed: sources,
      tokensUsed: result.tokensUsed, modelUsed: result.model,
      durationMs: result.durationMs, createdAt: new Date(),
    });
  }

  private async handleCost(request: CopilotRequest): Promise<CopilotResponse> {
    this.logger.log('Fetching live cost context');

    const sources: string[] = [];
    let costJson = 'null';
    let servicesJson = '[]';

    try {
      const { cost, services } = await this.platformContext.gatherCostContext(request.bearerToken);
      costJson = JSON.stringify(cost, null, 2);
      servicesJson = JSON.stringify(services, null, 2);
      sources.push('cost-service (summary)', 'cost-service (per-service)');
      this.logger.log(`Fetched cost data for ${(services as unknown[]).length} services`);
    } catch (err) {
      this.logger.warn(`Could not fetch cost data: ${err}`);
      costJson = '// Could not fetch — cost-service may be unavailable';
    }

    const messages = this.buildMessages(
      SYSTEM_PROMPTS.COST(costJson, servicesJson),
      request,
    );
    const result = await this.groq.complete(messages);

    return new CopilotResponse({
      id: randomUUID(), mode: CopilotMode.COST,
      content: result.content, contextUsed: sources,
      tokensUsed: result.tokensUsed, modelUsed: result.model,
      durationMs: result.durationMs, createdAt: new Date(),
    });
  }

  private async handleDeployment(request: CopilotRequest): Promise<CopilotResponse> {
    const serviceName = request.serviceName ?? 'unknown-service';
    this.logger.log(`Fetching metrics context for deployment advisory: ${serviceName}`);

    const sources: string[] = [];
    let metricsJson = '{}';

    try {
      const ctx = await this.platformContext.gatherFullContext(request.bearerToken);
      const svcMetrics = (ctx.servicesMetrics as Array<{ service: string }>)
        .find((s) => s.service === serviceName);
      metricsJson = JSON.stringify(svcMetrics ?? {}, null, 2);
      if (ctx.sources.includes('monitoring-service')) sources.push('monitoring-service');
      this.logger.log(`Found metrics for ${serviceName}: ${metricsJson.length} chars`);
    } catch (err) {
      this.logger.warn(`Could not fetch metrics for ${serviceName}: ${err}`);
      metricsJson = '// Could not fetch — monitoring-service may be unavailable';
    }

    const messages = this.buildMessages(
      SYSTEM_PROMPTS.DEPLOYMENT(serviceName, metricsJson),
      request,
    );
    const result = await this.groq.complete(messages);

    return new CopilotResponse({
      id: randomUUID(), mode: CopilotMode.DEPLOYMENT,
      content: result.content, contextUsed: sources,
      tokensUsed: result.tokensUsed, modelUsed: result.model,
      durationMs: result.durationMs, createdAt: new Date(),
    });
  }
}
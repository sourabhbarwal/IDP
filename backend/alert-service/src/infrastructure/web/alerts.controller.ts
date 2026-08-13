import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiException, buildPageResponse } from '@idp/common';
import { AlertRuleNameConflictError, AlertEventNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { CreateAlertRuleUseCase } from '../../application/use-cases/create-alert-rule.use-case';
import { ListAlertRulesUseCase } from '../../application/use-cases/list-alert-rules.use-case';
import { GetActiveAlertsUseCase } from '../../application/use-cases/get-active-alerts.use-case';
import { AcknowledgeAlertUseCase } from '../../application/use-cases/acknowledge-alert.use-case';
import { ProcessAlertManagerWebhookUseCase, AlertManagerWebhookPayload } from '../../application/use-cases/process-alertmanager-webhook.use-case';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { CreateAlertRuleRequestDto } from './dto/create-alert-rule-request.dto';
import { AlertRuleResponseDto } from './dto/alert-rule-response.dto';
import { AlertEventResponseDto } from './dto/alert-event-response.dto';

function clientIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null;
}

@ApiTags('alerts')
@Controller('api/v1/alerts')
export class AlertsController {
  constructor(
    private readonly createRuleUseCase: CreateAlertRuleUseCase,
    private readonly listRulesUseCase: ListAlertRulesUseCase,
    private readonly getActiveAlertsUseCase: GetActiveAlertsUseCase,
    private readonly acknowledgeAlertUseCase: AcknowledgeAlertUseCase,
    private readonly webhookUseCase: ProcessAlertManagerWebhookUseCase,
  ) {}

  // ── Alert Rules ────────────────────────────────────────────────────────────
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an alert rule' })
  async createRule(
    @Body() body: CreateAlertRuleRequestDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AlertRuleResponseDto> {
    try {
      const rule = await this.createRuleUseCase.execute({
        name: body.name,
        description: body.description ?? null,
        promqlExpression: body.promqlExpression,
        forDuration: body.forDuration ?? '5m',
        severity: body.severity,
        serviceId: body.serviceId ?? null,
        labels: body.labels ?? {},
        annotations: body.annotations ?? {},
        actorId: user.userId,
        ipAddress: clientIp(req),
      });
      return AlertRuleResponseDto.fromDomain(rule);
    } catch (err) {
      if (err instanceof AlertRuleNameConflictError) throw ApiException.conflict(err.message);
      throw err;
    }
  }

  @Get('rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List alert rules, optionally filtered by service' })
  async listRules(
    @Query('page') page = 0,
    @Query('size') size = 20,
    @Query('serviceId') serviceId?: string,
  ) {
    const result = await this.listRulesUseCase.execute(Number(page), Number(size), serviceId ?? null);
    return buildPageResponse(result.items.map(AlertRuleResponseDto.fromDomain), Number(page), Number(size), result.total);
  }

  // ── Active Alerts ──────────────────────────────────────────────────────────
  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all currently firing alerts' })
  async getActive(): Promise<AlertEventResponseDto[]> {
    const events = await this.getActiveAlertsUseCase.execute();
    return events.map(AlertEventResponseDto.fromDomain);
  }

  @Post('events/:id/acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Acknowledge a firing alert' })
  async acknowledge(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    try {
      await this.acknowledgeAlertUseCase.execute({ alertEventId: id, actorId: user.userId, ipAddress: clientIp(req) });
    } catch (err) {
      if (err instanceof AlertEventNotFoundError) throw ApiException.notFound('AlertEvent', id);
      throw err;
    }
  }

  // ── AlertManager Webhook (no JWT — bearer token auth instead) ───────────────
  @Post('webhook/alertmanager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive alert notifications from AlertManager' })
  async alertManagerWebhook(
    @Body() payload: AlertManagerWebhookPayload,
    @Req() req: Request,
  ): Promise<{ received: boolean }> {
    const token = (req.headers['authorization'] as string)?.replace('Bearer ', '');
    const expectedToken = process.env.WEBHOOK_TOKEN ?? '***REMOVED***';
    if (token !== expectedToken) throw ApiException.unauthorized('Invalid webhook token');

    await this.webhookUseCase.execute(payload);
    return { received: true };
  }
}
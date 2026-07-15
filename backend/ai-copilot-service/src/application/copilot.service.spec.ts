import { CopilotService } from './copilot.service';
import { GroqClientService } from './groq-client.service';
import { PlatformContextService } from './platform-context.service';
import { CopilotMode } from '../domain/enums/copilot-mode.enum';

describe('CopilotService', () => {
  let service: CopilotService;
  let groq: jest.Mocked<GroqClientService>;
  let platformContext: jest.Mocked<PlatformContextService>;

  beforeEach(() => {
    groq = {
      complete: jest.fn().mockResolvedValue({
        content: 'mocked response',
        tokensUsed: 10,
        model: 'llama3-70b-8192',
        durationMs: 5,
      }),
      isConfigured: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<GroqClientService>;

    platformContext = {
      gatherFullContext: jest.fn().mockResolvedValue({
        activeAlerts: [],
        costSummary: null,
        servicesMetrics: [{ service: 'auth-service', cpu: 10 }],
        sources: ['monitoring-service'],
      }),
      gatherAlertContext: jest.fn().mockResolvedValue({
        alerts: [{ id: 'alert-1' }],
        sources: ['alert-service'],
      }),
      gatherCostContext: jest.fn().mockResolvedValue({
        cost: { total: 100 },
        services: [{ service: 'auth-service', cost: 10 }],
        sources: ['cost-service (summary)', 'cost-service (per-service)'],
      }),
    } as unknown as jest.Mocked<PlatformContextService>;

    service = new CopilotService(groq, platformContext);
  });

  it('CHAT mode calls groq with no live context', async () => {
    const result = await service.chat({
      mode: CopilotMode.CHAT,
      message: 'How do I register a service?',
      history: [],
      bearerToken: 'token',
    });

    expect(result.mode).toBe(CopilotMode.CHAT);
    expect(result.content).toBe('mocked response');
    expect(result.contextUsed).toEqual([]);
    expect(groq.complete).toHaveBeenCalledTimes(1);
    expect(platformContext.gatherAlertContext).not.toHaveBeenCalled();
  });

  it('CHAT mode includes prior history in the messages sent to groq', async () => {
    await service.chat({
      mode: CopilotMode.CHAT,
      message: 'follow up question',
      history: [{ role: 'user', content: 'first question' }, { role: 'assistant', content: 'first answer' }],
      bearerToken: 'token',
    });

    const sentMessages = groq.complete.mock.calls[0][0];
    expect(sentMessages.some((m) => m.content === 'first question')).toBe(true);
    expect(sentMessages.some((m) => m.content === 'follow up question')).toBe(true);
  });

  it('INCIDENT mode gathers alert and metrics context', async () => {
    const result = await service.chat({
      mode: CopilotMode.INCIDENT,
      message: 'Investigate current issues',
      history: [],
      bearerToken: 'token',
    });

    expect(platformContext.gatherAlertContext).toHaveBeenCalledWith('token');
    expect(result.mode).toBe(CopilotMode.INCIDENT);
    expect(result.contextUsed).toContain('alert-service');
    expect(result.contextUsed).toContain('monitoring-service');
  });

  it('INCIDENT mode proceeds without metrics if gatherFullContext fails', async () => {
    platformContext.gatherFullContext.mockRejectedValueOnce(new Error('monitoring down'));

    const result = await service.chat({
      mode: CopilotMode.INCIDENT,
      message: 'Investigate',
      history: [],
      bearerToken: 'token',
    });

    expect(result.contextUsed).toEqual(['alert-service']);
  });

  it('COST mode gathers cost context and reports both sources', async () => {
    const result = await service.chat({
      mode: CopilotMode.COST,
      message: 'What should I rightsize?',
      history: [],
      bearerToken: 'token',
    });

    expect(platformContext.gatherCostContext).toHaveBeenCalledWith('token');
    expect(result.mode).toBe(CopilotMode.COST);
    expect(result.contextUsed).toEqual(['cost-service (summary)', 'cost-service (per-service)']);
  });

  it('DEPLOYMENT mode looks up metrics for the given service name', async () => {
    const result = await service.chat({
      mode: CopilotMode.DEPLOYMENT,
      message: 'Which strategy should I use?',
      serviceName: 'auth-service',
      history: [],
      bearerToken: 'token',
    });

    expect(platformContext.gatherFullContext).toHaveBeenCalledWith('token');
    expect(result.mode).toBe(CopilotMode.DEPLOYMENT);
    expect(result.contextUsed).toContain('monitoring-service');
  });

  it('DEPLOYMENT mode defaults service name when none provided', async () => {
    const result = await service.chat({
      mode: CopilotMode.DEPLOYMENT,
      message: 'Which strategy should I use?',
      history: [],
      bearerToken: 'token',
    });

    expect(result.mode).toBe(CopilotMode.DEPLOYMENT);
  });

  it('DEPLOYMENT mode proceeds without metrics if platform context fails', async () => {
    platformContext.gatherFullContext.mockRejectedValueOnce(new Error('down'));

    const result = await service.chat({
      mode: CopilotMode.DEPLOYMENT,
      message: 'Which strategy?',
      serviceName: 'auth-service',
      history: [],
      bearerToken: 'token',
    });

    expect(result.contextUsed).toEqual([]);
  });
});
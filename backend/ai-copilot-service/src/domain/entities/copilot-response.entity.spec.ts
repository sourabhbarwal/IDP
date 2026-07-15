import { CopilotResponse } from './copilot-response.entity';
import { CopilotMode } from '../enums/copilot-mode.enum';

describe('CopilotResponse', () => {
  it('assigns all constructor props', () => {
    const now = new Date();
    const response = new CopilotResponse({
      id: 'abc-123',
      mode: CopilotMode.CHAT,
      content: 'Hello from the copilot',
      contextUsed: ['alert-service'],
      tokensUsed: 42,
      modelUsed: 'llama3-70b-8192',
      durationMs: 250,
      createdAt: now,
    });

    expect(response.id).toBe('abc-123');
    expect(response.mode).toBe(CopilotMode.CHAT);
    expect(response.content).toBe('Hello from the copilot');
    expect(response.contextUsed).toEqual(['alert-service']);
    expect(response.tokensUsed).toBe(42);
    expect(response.modelUsed).toBe('llama3-70b-8192');
    expect(response.durationMs).toBe(250);
    expect(response.createdAt).toBe(now);
  });

  it('accepts an empty contextUsed array', () => {
    const response = new CopilotResponse({
      id: 'id-2',
      mode: CopilotMode.COST,
      content: 'no context used',
      contextUsed: [],
      tokensUsed: 0,
      modelUsed: 'mock',
      durationMs: 0,
      createdAt: new Date(),
    });

    expect(response.contextUsed).toEqual([]);
  });
});
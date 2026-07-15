import { GroqClientService } from './groq-client.service';
import { ConfigService } from '@nestjs/config';

function makeService(apiKey: string): GroqClientService {
  const config = {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'GROQ_API_KEY') return apiKey;
      if (key === 'GROQ_MODEL') return 'llama3-70b-8192';
      if (key === 'GROQ_MAX_TOKENS') return '1024';
      return def ?? '';
    }),
  } as unknown as ConfigService;
  return new GroqClientService(config);
}

describe('GroqClientService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('isConfigured() returns false when API key is placeholder', () => {
    const service = makeService('gsk_your_key_here');
    expect(service.isConfigured()).toBe(false);
  });

  it('isConfigured() returns false when API key is empty', () => {
    const service = makeService('');
    expect(service.isConfigured()).toBe(false);
  });

  it('isConfigured() returns true when real key is set', () => {
    const service = makeService('gsk_abc123realkey');
    expect(service.isConfigured()).toBe(true);
  });

  it('complete() returns mock response when not configured', async () => {
    const service = makeService('');
    const result = await service.complete([{ role: 'user', content: 'hello' }]);
    expect(result.model).toBe('mock');
    expect(result.content).toContain('demo mode');
    expect(result.tokensUsed).toBe(0);
  });

  it('complete() calls the Groq API and parses a successful response', async () => {
    const service = makeService('gsk_realkey123');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hi, I am the copilot.' } }],
        usage: { total_tokens: 55 },
        model: 'llama3-70b-8192',
      }),
    }) as unknown as typeof fetch;

    const result = await service.complete([{ role: 'user', content: 'hello' }]);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.content).toBe('Hi, I am the copilot.');
    expect(result.tokensUsed).toBe(55);
    expect(result.model).toBe('llama3-70b-8192');
    expect(typeof result.durationMs).toBe('number');
  });

  it('complete() falls back to configured model when response omits model', async () => {
    const service = makeService('gsk_realkey123');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'no model field' } }],
        usage: {},
      }),
    }) as unknown as typeof fetch;

    const result = await service.complete([{ role: 'user', content: 'hi' }]);

    expect(result.model).toBe('llama3-70b-8192');
    expect(result.tokensUsed).toBe(0);
  });

  it('complete() handles an empty choices array gracefully', async () => {
    const service = makeService('gsk_realkey123');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [], usage: { total_tokens: 0 }, model: 'llama3-70b-8192' }),
    }) as unknown as typeof fetch;

    const result = await service.complete([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('');
  });

  it('complete() throws when the Groq API returns a non-ok response', async () => {
    const service = makeService('gsk_realkey123');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    }) as unknown as typeof fetch;

    await expect(service.complete([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'Groq API error 401: invalid api key',
    );
  });
});
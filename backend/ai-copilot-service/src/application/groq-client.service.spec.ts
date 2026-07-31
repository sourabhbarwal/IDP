import { GroqClientService } from './groq-client.service';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, toArray } from 'rxjs';

function makeService(apiKey: string): GroqClientService {
  const config = {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'GROQ_API_KEY') return apiKey;
      if (key === 'GROQ_MODEL') return 'llama3-70b-8192';
      if (key === 'GROQ_MAX_TOKENS') return '2048';
      return def ?? '';
    }),
  } as unknown as ConfigService;
  return new GroqClientService(config);
}

describe('GroqClientService', () => {
  it('isConfigured() returns false for placeholder key', () => {
    expect(makeService('gsk_your_key_here').isConfigured()).toBe(false);
  });

  it('isConfigured() returns false for empty key', () => {
    expect(makeService('').isConfigured()).toBe(false);
  });

  it('isConfigured() returns true for real key', () => {
    expect(makeService('gsk_abc123realkey').isConfigured()).toBe(true);
  });

  it('complete() returns mock response when not configured', async () => {
    const service = makeService('');
    const result = await service.complete([{ role: 'user', content: 'hello' }]);
    expect(result.model).toBe('mock');
    expect(result.content).toContain('demo mode');
    expect(result.tokensUsed).toBe(0);
  });

  it('stream() emits delta chunks followed by done when not configured', async () => {
    const service = makeService('');
    const chunks = await firstValueFrom(
      service.stream([{ role: 'user', content: 'hello' }]).pipe(toArray()),
    );

    const deltas = chunks.filter((c) => c.type === 'delta');
    const done   = chunks.filter((c) => c.type === 'done');

    expect(deltas.length).toBeGreaterThan(0);
    expect(done.length).toBe(1);
    expect(done[0].model).toBe('mock');
  });

  it('stream() emits at least one delta with content', async () => {
    const service = makeService('');
    const chunks = await firstValueFrom(
      service.stream([{ role: 'user', content: 'hello' }]).pipe(toArray()),
    );

    const contentChunks = chunks.filter(
      (c) => c.type === 'delta' && c.content && c.content.length > 0,
    );
    expect(contentChunks.length).toBeGreaterThan(0);
  });
});

describe('GroqClientService — real streaming path (mocked fetch)', () => {
  let fetchSpy: jest.SpyInstance;

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  function sseStreamResponse(lines: string[]): Response {
    const encoder = new TextEncoder();
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index >= lines.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(lines[index] + '\n'));
        index++;
      },
    });
    return {
      ok: true,
      body: stream,
      text: async () => '',
    } as unknown as Response;
  }

  it('stream() parses SSE delta chunks and emits done on [DONE]', async () => {
    const service = makeService('gsk_realkey123');
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      sseStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}],"model":"llama3-70b-8192"}',
        '',
        'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}],"model":"llama3-70b-8192"}',
        '',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"total_tokens":12},"model":"llama3-70b-8192"}',
        '',
        'data: [DONE]',
        '',
      ]),
    );

    const chunks = await firstValueFrom(
      service.stream([{ role: 'user', content: 'hi' }]).pipe(toArray()),
    );

    const deltas = chunks.filter((c) => c.type === 'delta');
    const done = chunks.filter((c) => c.type === 'done');

    expect(deltas.map((d) => d.content)).toEqual(['Hello', ' world']);
    expect(done).toHaveLength(1);
    expect(done[0].tokensUsed).toBe(12);
    expect(done[0].model).toBe('llama3-70b-8192');
  });

  it('stream() emits an error chunk when fetch response is not ok', async () => {
    const service = makeService('gsk_realkey123');
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limit exceeded',
    } as Response);

    const chunks = await firstValueFrom(
      service.stream([{ role: 'user', content: 'hi' }]).pipe(toArray()),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('error');
    expect(chunks[0].error).toContain('429');
  });

  it('stream() emits an error chunk when response has no body', async () => {
    const service = makeService('gsk_realkey123');
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: null,
    } as unknown as Response);

    const chunks = await firstValueFrom(
      service.stream([{ role: 'user', content: 'hi' }]).pipe(toArray()),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('error');
  });

  it('stream() skips malformed JSON chunks without throwing', async () => {
    const service = makeService('gsk_realkey123');
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      sseStreamResponse([
        'data: not-valid-json{{{',
        '',
        'data: {"choices":[{"delta":{"content":"ok"},"finish_reason":null}]}',
        '',
        'data: [DONE]',
        '',
      ]),
    );

    const chunks = await firstValueFrom(
      service.stream([{ role: 'user', content: 'hi' }]).pipe(toArray()),
    );

    const deltas = chunks.filter((c) => c.type === 'delta');
    expect(deltas.map((d) => d.content)).toEqual(['ok']);
  });

  it('complete() (non-streaming) uses real Groq response when configured', async () => {
    const service = makeService('gsk_realkey123');
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'real response' } }],
        usage: { total_tokens: 42 },
        model: 'llama3-70b-8192',
      }),
    } as Response);

    const result = await service.complete([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('real response');
    expect(result.tokensUsed).toBe(42);
    expect(result.model).toBe('llama3-70b-8192');
  });

  it('complete() throws when the Groq API returns a non-ok response', async () => {
    const service = makeService('gsk_realkey123');
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    } as Response);

    await expect(
      service.complete([{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow('Groq API error 500');
  });
});
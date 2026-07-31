import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageRole } from '../domain/entities/conversation-message.entity';
import { Observable, Subject } from 'rxjs';

export interface GroqMessage {
  role: MessageRole;
  content: string;
}

export interface GroqCompletionResult {
  content: string;
  tokensUsed: number;
  model: string;
  durationMs: number;
}

export interface GroqStreamChunk {
  type: 'delta' | 'done' | 'error';
  content?: string;
  tokensUsed?: number;
  model?: string;
  durationMs?: number;
  error?: string;
}

@Injectable()
export class GroqClientService {
  private readonly logger = new Logger(GroqClientService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('GROQ_API_KEY', '');
    this.model = config.get<string>('GROQ_MODEL', 'llama3-70b-8192');
    this.maxTokens = Number(config.get<string>('GROQ_MAX_TOKENS', '2048'));
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'gsk_your_key_here';
  }

  // ── Non-streaming (kept for internal use by context gatherers) ────────────

  async complete(messages: GroqMessage[]): Promise<GroqCompletionResult> {
    if (!this.isConfigured()) {
      return this.mockResponse();
    }

    const startMs = Date.now();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: 0.7,
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error ${response.status}: ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content ?? '',
      tokensUsed: data.usage?.total_tokens ?? 0,
      model: data.model ?? this.model,
      durationMs: Date.now() - startMs,
    };
  }

  // ── Streaming — returns Observable that emits token chunks ────────────────

  stream(messages: GroqMessage[]): Observable<GroqStreamChunk> {
    const subject = new Subject<GroqStreamChunk>();

    if (!this.isConfigured()) {
      // Mock streaming — emit words one at a time for demo effect
      this.emitMockStream(subject);
      return subject.asObservable();
    }

    // Start streaming in background — don't await
    this.startGroqStream(messages, subject).catch((err) => {
      this.logger.error(`Stream error: ${err}`);
      subject.next({
        type: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      subject.complete();
    });

    return subject.asObservable();
  }

  private async startGroqStream(
    messages: GroqMessage[],
    subject: Subject<GroqStreamChunk>,
  ): Promise<void> {
    const startMs = Date.now();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: 0.7,
        stream: true,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Groq response has no body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let totalTokens = 0;
    let modelName = this.model;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep last incomplete line in buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === '') continue;

          // SSE format: "data: {...}" or "data: [DONE]"
          if (!trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6); // remove "data: "

          if (dataStr === '[DONE]') {
            subject.next({
              type: 'done',
              tokensUsed: totalTokens,
              model: modelName,
              durationMs: Date.now() - startMs,
            });
            subject.complete();
            return;
          }

          try {
            const chunk = JSON.parse(dataStr) as {
              choices: Array<{
                delta: { content?: string };
                finish_reason: string | null;
              }>;
              usage?: { total_tokens: number };
              model?: string;
            };

            if (chunk.model) modelName = chunk.model;
            if (chunk.usage?.total_tokens) totalTokens = chunk.usage.total_tokens;

            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              subject.next({ type: 'delta', content: delta });
            }

            // Some Groq responses include usage in the final chunk
            if (chunk.choices[0]?.finish_reason === 'stop') {
              // Don't complete here — wait for [DONE] marker
            }
          } catch {
            // Malformed JSON chunk — skip silently
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // If we exit the loop without [DONE], emit done anyway
    subject.next({
      type: 'done',
      tokensUsed: totalTokens,
      model: modelName,
      durationMs: Date.now() - startMs,
    });
    subject.complete();
  }

  private emitMockStream(subject: Subject<GroqStreamChunk>): void {
    const mockText =
      'AI Copilot is running in **demo mode**.\n\n' +
      'Set `GROQ_API_KEY` in your `.env` file to enable real streaming AI responses.\n\n' +
      'Get a free API key at [console.groq.com](https://console.groq.com) — ' +
      'no credit card required.';

    const words = mockText.split(' ');
    let i = 0;

    const interval = setInterval(() => {
      if (i >= words.length) {
        clearInterval(interval);
        subject.next({ type: 'done', tokensUsed: 0, model: 'mock', durationMs: 0 });
        subject.complete();
        return;
      }
      subject.next({ type: 'delta', content: (i === 0 ? '' : ' ') + words[i] });
      i++;
    }, 40); // 40ms per word ≈ realistic typing speed
  }

  private mockResponse(): GroqCompletionResult {
    return {
      content:
        'AI Copilot is running in demo mode. Set GROQ_API_KEY in your .env file to enable real AI responses.',
      tokensUsed: 0,
      model: 'mock',
      durationMs: 0,
    };
  }
}
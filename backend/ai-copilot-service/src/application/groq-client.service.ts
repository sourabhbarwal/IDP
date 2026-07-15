import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageRole } from '../domain/entities/conversation-message.entity';

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

/**
 * Thin wrapper around the Groq REST API.
 * Uses native fetch — no SDK needed, fewer dependencies.
 * Groq is OpenAI-compatible so this also works with OpenAI
 * by swapping the base URL and API key.
 */
@Injectable()
export class GroqClientService {
  private readonly logger = new Logger(GroqClientService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('GROQ_API_KEY', '');
    this.model = config.get<string>('GROQ_MODEL', 'openai/gpt-oss-120b');
    this.maxTokens = Number(config.get<string>('GROQ_MAX_TOKENS', '1024'));
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'gsk_your_key_here';
  }

  async complete(messages: GroqMessage[]): Promise<GroqCompletionResult> {
    if (!this.isConfigured()) {
      this.logger.warn('GROQ_API_KEY not configured — returning mock response');
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

    const content = data.choices[0]?.message?.content ?? '';
    const tokensUsed = data.usage?.total_tokens ?? 0;

    return {
      content,
      tokensUsed,
      model: data.model ?? this.model,
      durationMs: Date.now() - startMs,
    };
  }

  private mockResponse(): GroqCompletionResult {
    return {
      content: 'AI Copilot is running in demo mode. Set GROQ_API_KEY in your .env file to enable real AI responses. Get a free key at console.groq.com',
      tokensUsed: 0,
      model: 'mock',
      durationMs: 0,
    };
  }
}
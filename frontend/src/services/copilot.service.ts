import { apiClient } from '../lib/api-client';

const COPILOT_BASE = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3012'}/api/v1`;

export type CopilotMode = 'CHAT' | 'INCIDENT' | 'COST' | 'DEPLOYMENT';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface CopilotChatRequest {
  mode: CopilotMode;
  message: string;
  history: ChatMessage[];
  serviceName?: string;
}

export interface CopilotChatResponse {
  id: string;
  mode: string;
  content: string;
  contextUsed: string[];
  tokensUsed: number;
  modelUsed: string;
  durationMs: number;
  createdAt: string;
}

export interface CopilotStatus {
  configured: boolean;
  streaming: boolean;
  message: string;
}

// ── SSE Stream types ──────────────────────────────────────────────────────────

export interface StreamContextEvent {
  type: 'context';
  contextUsed: string[];
}

export interface StreamDeltaEvent {
  type: 'delta';
  content: string;
}

export interface StreamDoneEvent {
  type: 'done';
  tokensUsed: number;
  model: string;
  durationMs: number;
}

export interface StreamErrorEvent {
  type: 'error';
  error: string;
}

export type StreamEvent =
  | StreamContextEvent
  | StreamDeltaEvent
  | StreamDoneEvent
  | StreamErrorEvent;

export interface StreamCallbacks {
  onContext?: (contextUsed: string[]) => void;
  onDelta:    (content: string) => void;
  onDone:     (tokensUsed: number, model: string, durationMs: number) => void;
  onError?:   (error: string) => void;
}

/**
 * Streams a chat response from the AI Copilot using fetch + ReadableStream.
 *
 * We use fetch (not EventSource) because:
 * 1. EventSource only supports GET requests
 * 2. We need to send a POST body (message, history, mode)
 * 3. We need to send Authorization header
 *
 * Returns an AbortController so the caller can cancel the stream.
 */
export function streamChat(
  request: CopilotChatRequest,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('accessToken') ?? '';

  const run = async () => {
    const response = await fetch(`${COPILOT_BASE}/copilot/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      callbacks.onError?.(`HTTP ${response.status}: ${errorText}`);
      return;
    }

    if (!response.body) {
      callbacks.onError?.('Response has no body');
      return;
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6);
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr) as StreamEvent;

            switch (event.type) {
              case 'context':
                callbacks.onContext?.(event.contextUsed);
                break;
              case 'delta':
                if (event.content) callbacks.onDelta(event.content);
                break;
              case 'done':
                callbacks.onDone(event.tokensUsed, event.model, event.durationMs);
                break;
              case 'error':
                callbacks.onError?.(event.error);
                break;
            }
          } catch {
            // Malformed JSON — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  run().catch((err) => {
    if (err.name !== 'AbortError') {
      callbacks.onError?.(err instanceof Error ? err.message : String(err));
    }
  });

  return controller;
}

// ── Non-streaming fallback ────────────────────────────────────────────────────

export const copilotService = {
  chat: (payload: CopilotChatRequest) =>
    apiClient.post<CopilotChatResponse>(`${COPILOT_BASE}/copilot/chat`, payload),

  getStatus: () =>
    apiClient.get<CopilotStatus>(`${COPILOT_BASE}/copilot/status`),
};
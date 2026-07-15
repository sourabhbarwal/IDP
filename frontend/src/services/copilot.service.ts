import { apiClient } from '../lib/api-client';

const BASE = 'http://localhost:3012/api/v1';

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
  message: string;
}

export const copilotService = {
  chat: (payload: CopilotChatRequest) =>
    apiClient.post<CopilotChatResponse>(`${BASE}/copilot/chat`, payload),
  getStatus: () =>
    apiClient.get<CopilotStatus>(`${BASE}/copilot/status`),
};
import { useState, useEffect, useCallback } from 'react';
import { CopilotMode } from '../services/copilot.service';

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  contextUsed?: string[];
  tokensUsed?: number;
  durationMs?: number;
  isError?: boolean;
  timestamp: string;
}

const STORAGE_KEY = (mode: CopilotMode) => `idp-copilot-history-${mode}`;
const MAX_MESSAGES_PER_MODE = 40; // 20 turns

function loadHistory(mode: CopilotMode): StoredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(mode));
    if (!raw) return [];
    return JSON.parse(raw) as StoredMessage[];
  } catch {
    return [];
  }
}

function saveHistory(mode: CopilotMode, messages: StoredMessage[]): void {
  try {
    // Keep only the last MAX_MESSAGES_PER_MODE to avoid token overflow
    const toSave = messages.slice(-MAX_MESSAGES_PER_MODE);
    localStorage.setItem(STORAGE_KEY(mode), JSON.stringify(toSave));
  } catch {
    // localStorage full — fail silently
  }
}

export function useCopilotHistory(mode: CopilotMode) {
  const [messages, setMessages] = useState<StoredMessage[]>(() => loadHistory(mode));

  // When mode changes, load that mode's history
  useEffect(() => {
    setMessages(loadHistory(mode));
  }, [mode]);

  const addMessage = useCallback((message: Omit<StoredMessage, 'timestamp'>) => {
    setMessages((prev) => {
      const newMessages = [...prev, { ...message, timestamp: new Date().toISOString() }];
      saveHistory(mode, newMessages);
      return newMessages;
    });
  }, [mode]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY(mode));
    setMessages([]);
  }, [mode]);

  const clearAllHistory = useCallback(() => {
    (['CHAT', 'INCIDENT', 'COST', 'DEPLOYMENT'] as CopilotMode[]).forEach((m) => {
      localStorage.removeItem(STORAGE_KEY(m));
    });
    setMessages([]);
  }, []);

  // How many tokens approx are in history (rough estimate for display)
  const estimatedTokens = messages.reduce(
    (sum, m) => sum + Math.ceil(m.content.length / 4),
    0,
  );

  return { messages, addMessage, clearHistory, clearAllHistory, estimatedTokens };
}
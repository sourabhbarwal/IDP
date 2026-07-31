import { useState, useEffect, useCallback } from 'react';
import { CopilotMode } from '../services/copilot.service';

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  contextUsed?: string[];
  tokensUsed?: number;
  durationMs?: number;
  isError?: boolean;
  isStreaming?: boolean;  // true while streaming is in progress
  timestamp: string;
}

const STORAGE_KEY = (mode: CopilotMode) => `idp-copilot-history-${mode}`;
const MAX_MESSAGES_PER_MODE = 40;

function loadHistory(mode: CopilotMode): StoredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(mode));
    if (!raw) return [];
    // Clear any stuck streaming messages from previous sessions
    const msgs = JSON.parse(raw) as StoredMessage[];
    return msgs.map((m) => ({ ...m, isStreaming: false }));
  } catch {
    return [];
  }
}

function saveHistory(mode: CopilotMode, messages: StoredMessage[]): void {
  try {
    // Don't save messages that are still streaming
    const toSave = messages
      .filter((m) => !m.isStreaming)
      .slice(-MAX_MESSAGES_PER_MODE);
    localStorage.setItem(STORAGE_KEY(mode), JSON.stringify(toSave));
  } catch {
    // localStorage full
  }
}

export function useCopilotHistory(mode: CopilotMode) {
  const [messages, setMessages] = useState<StoredMessage[]>(() => loadHistory(mode));

  useEffect(() => {
    setMessages(loadHistory(mode));
  }, [mode]);

  const addMessage = useCallback((message: Omit<StoredMessage, 'timestamp'>) => {
    setMessages((prev) => {
      const newMessages = [...prev, { ...message, timestamp: new Date().toISOString() }];
      if (!message.isStreaming) saveHistory(mode, newMessages);
      return newMessages;
    });
  }, [mode]);

  /**
   * Append content to the last message (used during streaming).
   * Efficient — only updates the last message, no full array rebuild.
   */
  const appendToLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.content += content;
      updated[updated.length - 1] = last;
      return updated;
    });
  }, []);

  /**
   * Finalise the last message after streaming completes.
   * Marks isStreaming=false and saves to localStorage.
   */
  const finaliseLastMessage = useCallback((
    updates: Partial<Pick<StoredMessage, 'tokensUsed' | 'durationMs' | 'contextUsed' | 'isError'>>
  ) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = { ...updated[updated.length - 1], ...updates, isStreaming: false };
      updated[updated.length - 1] = last;
      saveHistory(mode, updated);
      return updated;
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

  const estimatedTokens = messages.reduce(
    (sum, m) => sum + Math.ceil(m.content.length / 4),
    0,
  );

  return {
    messages,
    addMessage,
    appendToLastMessage,
    finaliseLastMessage,
    clearHistory,
    clearAllHistory,
    estimatedTokens,
  };
}
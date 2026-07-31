import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  copilotService,
  streamChat,
  CopilotMode,
} from '../../services/copilot.service';
import { useCopilotHistory, StoredMessage } from '../../hooks/useCopilotHistory';

// ── Mode config (same as before) ──────────────────────────────────────────────

const MODES: Array<{
  id: CopilotMode;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
  contextSources: string[];
  badgeColor: string;
}> = [
  {
    id: 'CHAT',
    label: 'Platform Chat',
    icon: '💬',
    description: 'General platform questions',
    placeholder: 'How do I register a new service in the catalog?',
    contextSources: [],
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    id: 'INCIDENT',
    label: 'Incident Investigator',
    icon: '🔍',
    description: 'Investigate alerts with live data',
    placeholder: 'Investigate current platform health and identify any issues.',
    contextSources: ['alert-service', 'monitoring-service'],
    badgeColor: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    id: 'COST',
    label: 'Cost Advisor',
    icon: '💰',
    description: 'Rightsizing from live cost data',
    placeholder: 'Which services should I rightsize first?',
    contextSources: ['cost-service'],
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    id: 'DEPLOYMENT',
    label: 'Deployment Advisor',
    icon: '🚀',
    description: 'Best strategy for deploying a service',
    placeholder: 'Which deployment strategy should I use for auth-service?',
    contextSources: ['monitoring-service'],
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
  },
];

const PROSE_CLASSES = `prose prose-sm max-w-none
  prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:mt-4 prose-headings:mb-2
  prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
  prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-2
  prose-ul:my-2 prose-ul:pl-4 prose-ol:my-2 prose-ol:pl-4
  prose-li:text-gray-700 prose-li:my-0.5 prose-li:leading-relaxed
  prose-strong:text-gray-900 prose-strong:font-semibold
  prose-code:text-primary-700 prose-code:bg-primary-50 prose-code:px-1.5
  prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
  prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:rounded-xl
  prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:my-3 prose-pre:text-xs prose-pre:leading-relaxed
  prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:bg-primary-50
  prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
  prose-table:w-full prose-table:text-xs prose-table:border-collapse prose-table:my-3
  prose-thead:bg-gray-50
  prose-th:border prose-th:border-gray-200 prose-th:px-3 prose-th:py-2
  prose-th:text-left prose-th:font-semibold prose-th:text-gray-700
  prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2
  prose-td:text-gray-600 prose-td:align-top
  prose-tr:even:bg-gray-50
  prose-a:text-primary-600 prose-a:underline
  prose-hr:border-gray-200 prose-hr:my-4`;

// ── Sub-components ─────────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-5">
      <div className="max-w-2xl">
        <div className="bg-primary-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({ message }: { message: StoredMessage }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex justify-start mb-5 gap-3">
      {/* Avatar */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        shadow-sm mt-0.5 transition-all
        ${message.isStreaming
          ? 'bg-gradient-to-br from-primary-400 to-primary-600 animate-pulse'
          : 'bg-gradient-to-br from-primary-500 to-primary-700'
        }`}>
        <span className="text-white text-xs font-bold">AI</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Message bubble */}
        <div className={`rounded-2xl rounded-tl-md px-5 py-4 shadow-sm border transition-colors ${
          message.isError
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-gray-200'
        }`}>
          {message.content ? (
            <div className={PROSE_CLASSES}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {/* Blinking cursor shown while streaming */}
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-primary-500 ml-0.5 align-middle animate-pulse" />
              )}
            </div>
          ) : message.isStreaming ? (
            /* Empty streaming state — show fetching indicator */
            <div className="flex items-center gap-2 text-gray-400">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-primary-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              <span className="text-xs">Fetching platform data...</span>
            </div>
          ) : null}
        </div>

        {/* Metadata row — shown after streaming completes */}
        {!message.isStreaming && (
          <div className="flex items-center gap-3 mt-1.5 px-1 flex-wrap">
            <span className="text-xs text-gray-300">{time}</span>
            {message.contextUsed && message.contextUsed.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-400">
                  Live: <span className="text-emerald-600 font-medium">
                    {message.contextUsed.join(', ')}
                  </span>
                </span>
              </div>
            )}
            {(message.tokensUsed ?? 0) > 0 && (
              <span className="text-xs text-gray-300">{message.tokensUsed} tokens</span>
            )}
            {(message.durationMs ?? 0) > 0 && (
              <span className="text-xs text-gray-300">{message.durationMs}ms</span>
            )}
          </div>
        )}

        {/* Live streaming indicator */}
        {message.isStreaming && message.content && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
            <span className="text-xs text-primary-500">Streaming response...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ mode }: { mode: typeof MODES[0] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center
                      text-4xl mb-5 shadow-inner">
        {mode.icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.label}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-md leading-relaxed">{mode.description}</p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-md w-full mb-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Try asking</p>
        <p className="text-sm text-gray-600 italic leading-relaxed">"{mode.placeholder}"</p>
      </div>

      {mode.contextSources.length > 0 && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs
                         font-medium ${mode.badgeColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          Pulls live data from: {mode.contextSources.join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<CopilotMode>('CHAT');
  const [input, setInput] = useState('');
  const [serviceName, setServiceName] = useState('auth-service');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const {
    messages, addMessage, appendToLastMessage, finaliseLastMessage,
    clearHistory, clearAllHistory, estimatedTokens,
  } = useCopilotHistory(mode);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef  = useRef<AbortController | null>(null);
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  useEffect(() => { checkStatus(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleModeSwitch = (newMode: CopilotMode) => {
    // Cancel any in-progress stream before switching
    streamAbortRef.current?.abort();
    setMode(newMode);
    setInput('');
    setLoading(false);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const checkStatus = async () => {
    try {
      const { data } = await copilotService.getStatus();
      setConfigured(data.configured);
      setStatusMessage(data.message);
    } catch {
      setConfigured(false);
      setStatusMessage('AI Copilot service is offline. Run: docker compose up -d ai-copilot-service');
    }
  };

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Add user message
    addMessage({ role: 'user', content: trimmed });

    // Add empty assistant message that will be filled by streaming
    addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    // Start streaming
    const abort = streamChat(
      {
        mode,
        message: trimmed,
        history,
        serviceName: mode === 'DEPLOYMENT' ? serviceName : undefined,
      },
      {
        onContext: (contextUsed) => {
          // Update the assistant message with context info immediately
          finaliseLastMessage({ contextUsed, isError: false });
          // Re-mark as streaming since we're not done yet
          // We do this by appending empty string (no-op for content, keeps isStreaming flag)
        },
        onDelta: (content) => {
          appendToLastMessage(content);
          // Scroll as content arrives
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        },
        onDone: (tokensUsed, _model, durationMs) => {
          finaliseLastMessage({ tokensUsed, durationMs });
          setLoading(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        },
        onError: (error) => {
          finaliseLastMessage({
            isError: true,
          });
          // Replace last message content with error
          appendToLastMessage(`\n\n**Error:** ${error}`);
          finaliseLastMessage({});
          setLoading(false);
        },
      },
    );

    streamAbortRef.current = abort;
  }, [input, loading, mode, serviceName, messages, addMessage, appendToLastMessage, finaliseLastMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleStop = () => {
    streamAbortRef.current?.abort();
    finaliseLastMessage({});
    setLoading(false);
  };

  const historyStats = (['CHAT', 'INCIDENT', 'COST', 'DEPLOYMENT'] as CopilotMode[]).map((m) => {
    try {
      const raw = localStorage.getItem(`idp-copilot-history-${m}`);
      const msgs = raw ? (JSON.parse(raw) as StoredMessage[]) : [];
      return { mode: m, count: msgs.length };
    } catch {
      return { mode: m, count: 0 };
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 z-10">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">IDP Platform</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">AI Copilot</span>

        <div className="ml-auto flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            configured === true
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : configured === false
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              configured === true ? 'bg-emerald-500' :
              configured === false ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
            {configured === true ? 'Groq Streaming' :
             configured === false ? 'Demo Mode' : 'Connecting...'}
          </div>
          <span className="text-sm text-gray-400 hidden md:block">{user?.email}</span>
        </div>
      </nav>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mode</p>
            <div className="space-y-1">
              {MODES.map((m) => {
                const stat = historyStats.find((s) => s.mode === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleModeSwitch(m.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                      mode === m.id
                        ? 'bg-primary-50 border-primary-200'
                        : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            mode === m.id ? 'text-primary-700' : 'text-gray-700'
                          }`}>
                            {m.label}
                          </p>
                          {(stat?.count ?? 0) > 0 && (
                            <span className="text-xs text-gray-400 shrink-0 ml-1">
                              {stat?.count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">
                          {m.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live context sources */}
          {currentMode.contextSources.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Live Context
              </p>
              <div className="space-y-1">
                {currentMode.contextSources.map((src) => (
                  <div key={src} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-gray-500">{src}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Token usage + history controls */}
          <div className="p-4 border-t border-gray-100 mt-auto space-y-2">
            {estimatedTokens > 0 && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Context</span>
                  <span>~{estimatedTokens} tokens</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      estimatedTokens > 3000 ? 'bg-orange-400' : 'bg-primary-400'
                    }`}
                    style={{ width: `${Math.min((estimatedTokens / 6000) * 100, 100)}%` }}
                  />
                </div>
                {estimatedTokens > 3000 && (
                  <p className="text-xs text-orange-500 mt-1">History is long — consider clearing</p>
                )}
              </div>
            )}

            <button
              onClick={clearHistory}
              disabled={messages.length === 0}
              className="w-full px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg
                         hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40
                         disabled:cursor-not-allowed transition-colors"
            >
              ↺ Clear {currentMode.label} history
            </button>
            <button
              onClick={clearAllHistory}
              className="w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Clear all mode histories
            </button>
          </div>
        </aside>

        {/* ── Main chat area ────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Status banner */}
          {configured === false && (
            <div className="px-6 py-2.5 bg-yellow-50 border-b border-yellow-200 shrink-0">
              <p className="text-xs text-yellow-800">⚠️ {statusMessage}</p>
            </div>
          )}

          {/* Deployment mode — service picker */}
          {mode === 'DEPLOYMENT' && (
            <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 shrink-0 flex items-center gap-3">
              <label className="text-sm font-medium text-purple-700 shrink-0">Service:</label>
              <input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. auth-service"
                className="px-3 py-1.5 text-sm border border-purple-200 rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-purple-400 w-48"
              />
              <p className="text-xs text-purple-500">
                Live metrics for this service will be included as AI context
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6">
              {messages.length === 0 ? (
                <EmptyState mode={currentMode} />
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 shrink-0">
                      {messages.length} messages · persisted locally
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {messages.map((msg, idx) =>
                    msg.role === 'user'
                      ? <UserBubble key={idx} content={msg.content} />
                      : <AssistantBubble key={idx} message={msg} />
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={currentMode.placeholder}
                    rows={1}
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none
                               focus:outline-none focus:ring-2 focus:ring-primary-500
                               focus:border-transparent text-sm text-gray-800
                               placeholder:text-gray-400 disabled:bg-gray-50
                               disabled:text-gray-400 transition-shadow leading-relaxed"
                    style={{ minHeight: '48px', maxHeight: '160px' }}
                  />
                </div>

                {/* Send / Stop button */}
                {loading ? (
                  <button
                    onClick={handleStop}
                    className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white
                               rounded-xl transition-colors shrink-0 shadow-sm"
                    title="Stop generating"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="px-5 py-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                               disabled:opacity-40 disabled:cursor-not-allowed
                               text-white rounded-xl transition-colors shrink-0 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-xs text-gray-300">⏎ Send · Shift+⏎ New line</p>
                <div className="flex items-center gap-2">
                  {loading && (
                    <span className="text-xs text-primary-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                      Streaming...
                    </span>
                  )}
                  <p className="text-xs text-gray-300">
                    {configured ? 'llama3-70b-8192 via Groq' : 'Demo mode'}
                    {messages.length > 0 && ` · ${messages.length} messages`}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
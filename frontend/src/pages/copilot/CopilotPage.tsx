import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import {
  copilotService,
  CopilotMode,
  ChatMessage,
} from '../../services/copilot.service';
import ReactMarkdown from 'react-markdown';

const MODES: Array<{
  id: CopilotMode;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
}> = [
  {
    id: 'CHAT',
    label: 'Platform Chat',
    icon: '💬',
    description: 'General questions about the IDP platform',
    placeholder: 'How do I register a new service in the catalog?',
  },
  {
    id: 'INCIDENT',
    label: 'Incident Investigator',
    icon: '🔍',
    description: 'Investigate active alerts with live platform data',
    placeholder: 'What is causing the current incidents? Walk me through the investigation.',
  },
  {
    id: 'COST',
    label: 'Cost Advisor',
    icon: '💰',
    description: 'Get rightsizing recommendations from live cost data',
    placeholder: 'Which services are oversized and what should I change?',
  },
  {
    id: 'DEPLOYMENT',
    label: 'Deployment Advisor',
    icon: '🚀',
    description: 'Choose the right deployment strategy for a service',
    placeholder: 'Which deployment strategy should I use for auth-service?',
  },
];

function MessageBubble({ message }: { message: ChatMessage & { contextUsed?: string[]; durationMs?: number } }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-xs text-white font-bold">AI</div>
            <span className="text-xs text-gray-400">
              {message.durationMs ? `${message.durationMs}ms` : ''}
              {message.contextUsed && message.contextUsed.length > 0 && (
                <span className="ml-2 text-primary-500">
                  Context: {message.contextUsed.join(', ')}
                </span>
              )}
            </span>
          </div>
        )}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-code:text-primary-600">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<CopilotMode>('CHAT');
  const [messages, setMessages] = useState<Array<ChatMessage & { contextUsed?: string[]; durationMs?: number }>>([]);
  const [input, setInput] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Clear conversation when mode changes
    setMessages([]);
    setInput('');
  }, [mode]);

  const checkStatus = async () => {
    try {
      const { data } = await copilotService.getStatus();
      setConfigured(data.configured);
      setStatusMessage(data.message);
    } catch {
      setConfigured(false);
      setStatusMessage('AI Copilot service is not running. Start it with docker compose up -d');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await copilotService.chat({
        mode,
        message: userMessage.content,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
        serviceName: mode === 'DEPLOYMENT' ? serviceName : undefined,
      });

      const assistantMessage = {
        role: 'assistant' as const,
        content: data.content,
        contextUsed: data.contextUsed,
        durationMs: data.durationMs,
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to get response';
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errMsg}. Make sure the AI Copilot service is running and GROQ_API_KEY is set.`,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">
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
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            configured === true ? 'bg-emerald-100 text-emerald-700' :
            configured === false ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {configured === true ? '● Groq Connected' :
             configured === false ? '● Demo Mode' :
             '● Checking...'}
          </span>
          <span className="text-sm text-gray-400">{user?.email}</span>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — mode selector */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Copilot Mode</h2>
          </div>
          <div className="flex-1 p-3 space-y-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-colors ${
                  mode === m.id
                    ? 'bg-primary-50 border border-primary-200 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{m.icon}</span>
                  <span className="font-medium text-sm">{m.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-7">{m.description}</p>
              </button>
            ))}
          </div>

          {/* Context info */}
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">Live context sources</p>
            {['INCIDENT', 'COST', 'DEPLOYMENT'].includes(mode) ? (
              <div className="space-y-1">
                {mode === 'INCIDENT' && (
                  <>
                    <p className="text-xs text-gray-500">• alert-service (active alerts)</p>
                    <p className="text-xs text-gray-500">• monitoring-service (metrics)</p>
                  </>
                )}
                {mode === 'COST' && (
                  <>
                    <p className="text-xs text-gray-500">• cost-service (summary)</p>
                    <p className="text-xs text-gray-500">• cost-service (per-service)</p>
                  </>
                )}
                {mode === 'DEPLOYMENT' && (
                  <p className="text-xs text-gray-500">• monitoring-service (metrics)</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No live data — general knowledge</p>
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Status banner */}
          {configured === false && (
            <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm shrink-0">
              ⚠️ {statusMessage}
            </div>
          )}

          {/* Deployment mode — service name input */}
          {mode === 'DEPLOYMENT' && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-3 shrink-0">
              <span className="text-sm text-blue-700 font-medium shrink-0">Service name:</span>
              <input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. auth-service"
                className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
              />
              <span className="text-xs text-blue-500">Used to fetch live metrics for this service</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-4">{currentMode.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{currentMode.label}</h3>
                <p className="text-gray-500 mb-6 max-w-md">{currentMode.description}</p>
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 max-w-md">
                  <p className="text-xs text-gray-400 mb-1">Example:</p>
                  <p className="text-sm text-gray-600 italic">"{currentMode.placeholder}"</p>
                </div>
                {['INCIDENT', 'COST', 'DEPLOYMENT'].includes(mode) && (
                  <p className="text-xs text-primary-500 mt-4">
                    ✨ This mode pulls live data from your platform before answering
                  </p>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))}
                {loading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-xs text-gray-400 ml-2">
                          {['INCIDENT', 'COST', 'DEPLOYMENT'].includes(mode)
                            ? 'Fetching platform data...'
                            : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 bg-white p-4 shrink-0">
            <div className="flex gap-3 items-end max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentMode.placeholder}
                  rows={1}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  style={{ maxHeight: '120px', overflowY: 'auto' }}
                />
                <span className="absolute right-3 bottom-3 text-xs text-gray-300">⏎ send</span>
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="px-5 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0 text-sm font-medium"
              >
                {loading ? '...' : 'Send'}
              </button>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="px-3 py-3 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl text-sm"
                  title="Clear conversation"
                >
                  ↺
                </button>
              )}
            </div>
            <p className="text-center text-xs text-gray-300 mt-2">
              Powered by {configured ? 'Groq / llama3-70b-8192' : 'Demo Mode'} · Shift+Enter for new line
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
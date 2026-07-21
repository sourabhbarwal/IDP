// import { useEffect, useRef, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { useAppSelector } from '../../hooks/redux';
// import ReactMarkdown from 'react-markdown';
// import {
//   copilotService,
//   CopilotMode,
//   ChatMessage,
// } from '../../services/copilot.service';
// import remarkGfm from 'remark-gfm';
// // ── Mode config ────────────────────────────────────────────────────────────

// const MODES: Array<{
//   id: CopilotMode;
//   label: string;
//   icon: string;
//   description: string;
//   placeholder: string;
//   color: string;
//   contextSources: string[];
// }> = [
//   {
//     id: 'CHAT',
//     label: 'Platform Chat',
//     icon: '💬',
//     description: 'General questions about the IDP platform',
//     placeholder: 'How do I register a new service in the catalog?',
//     color: 'blue',
//     contextSources: [],
//   },
//   {
//     id: 'INCIDENT',
//     label: 'Incident Investigator',
//     icon: '🔍',
//     description: 'Investigate active alerts with live platform data',
//     placeholder: 'Investigate current platform health and identify any issues.',
//     color: 'red',
//     contextSources: ['alert-service', 'monitoring-service'],
//   },
//   {
//     id: 'COST',
//     label: 'Cost Advisor',
//     icon: '💰',
//     description: 'Rightsizing recommendations from live cost data',
//     placeholder: 'Which services should I rightsize first to reduce costs?',
//     color: 'green',
//     contextSources: ['cost-service (summary)', 'cost-service (per-service)'],
//   },
//   {
//     id: 'DEPLOYMENT',
//     label: 'Deployment Advisor',
//     icon: '🚀',
//     description: 'Best deployment strategy for a service',
//     placeholder: 'Which deployment strategy should I use for auth-service?',
//     color: 'purple',
//     contextSources: ['monitoring-service'],
//   },
// ];

// const MODE_COLORS: Record<string, string> = {
//   blue:   'bg-blue-50 border-blue-200 text-blue-700',
//   red:    'bg-red-50 border-red-200 text-red-700',
//   green:  'bg-emerald-50 border-emerald-200 text-emerald-700',
//   purple: 'bg-purple-50 border-purple-200 text-purple-700',
// };

// const MODE_ACTIVE_COLORS: Record<string, string> = {
//   blue:   'bg-blue-50 border-blue-300',
//   red:    'bg-red-50 border-red-300',
//   green:  'bg-emerald-50 border-emerald-300',
//   purple: 'bg-purple-50 border-purple-300',
// };

// // ── Message types ──────────────────────────────────────────────────────────

// interface DisplayMessage {
//   role: 'user' | 'assistant';
//   content: string;
//   contextUsed?: string[];
//   tokensUsed?: number;
//   durationMs?: number;
//   isError?: boolean;
// }

// // ── Sub-components ─────────────────────────────────────────────────────────

// function UserBubble({ content }: { content: string }) {
//   return (
//     <div className="flex justify-end mb-6">
//       <div className="max-w-2xl">
//         <div className="bg-primary-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
//           <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// function AssistantBubble({ message }: { message: DisplayMessage }) {
//   return (
//     <div className="flex justify-start mb-6 gap-3">
//       {/* Avatar */}
//       <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm mt-1">
//         <span className="text-white text-xs font-bold">AI</span>
//       </div>

//       <div className="flex-1 max-w-3xl">
//         {/* Message bubble */}
//         <div className={`rounded-2xl rounded-tl-md px-5 py-4 shadow-sm border ${
//           message.isError
//             ? 'bg-red-50 border-red-200'
//             : 'bg-white border-gray-200'
//         }`}>
//           {/* Markdown content */}
//           <div className="prose prose-sm max-w-none
//             prose-headings:font-semibold prose-headings:text-gray-900
//             prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
//             prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-2
//             prose-ul:my-2 prose-ol:my-2
//             prose-li:text-gray-700 prose-li:my-0.5
//             prose-strong:text-gray-900 prose-strong:font-semibold
//             prose-code:text-primary-700 prose-code:bg-primary-50
//             prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
//             prose-code:text-xs prose-code:font-mono
//             prose-code:before:content-none prose-code:after:content-none
//             prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:rounded-xl
//             prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:my-3
//             prose-pre:text-xs prose-pre:leading-relaxed
//             prose-blockquote:border-l-4 prose-blockquote:border-primary-300
//             prose-blockquote:bg-primary-50 prose-blockquote:px-4 prose-blockquote:py-2
//             prose-blockquote:rounded-r-lg prose-blockquote:not-italic
//             prose-table:w-full prose-table:text-sm prose-table:border-collapse
//             prose-thead:bg-gray-50
//             prose-th:border prose-th:border-gray-200 prose-th:px-3 prose-th:py-2
//             prose-th:text-left prose-th:font-semibold prose-th:text-gray-700 prose-th:text-xs
//             prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2
//             prose-td:text-gray-600 prose-td:text-xs prose-td:align-top
//             prose-tr:even:bg-gray-50
//             prose-a:text-primary-600 prose-a:underline
//             prose-hr:border-gray-200 prose-hr:my-4
//           ">
//             <ReactMarkdown remarkPlugins={[remarkGfm]}>
//               {message.content}
//             </ReactMarkdown>
//           </div>
//         </div>

//         {/* Metadata row */}
//         {(message.contextUsed?.length || message.tokensUsed || message.durationMs) ? (
//           <div className="flex items-center gap-3 mt-2 px-1">
//             {message.contextUsed && message.contextUsed.length > 0 && (
//               <div className="flex items-center gap-1.5">
//                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
//                 <span className="text-xs text-gray-400">
//                   Live data: <span className="text-emerald-600 font-medium">{message.contextUsed.join(', ')}</span>
//                 </span>
//               </div>
//             )}
//             {message.tokensUsed !== undefined && message.tokensUsed > 0 && (
//               <span className="text-xs text-gray-300">{message.tokensUsed} tokens</span>
//             )}
//             {message.durationMs !== undefined && message.durationMs > 0 && (
//               <span className="text-xs text-gray-300">{message.durationMs}ms</span>
//             )}
//           </div>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// function TypingIndicator({ mode }: { mode: CopilotMode }) {
//   const isLive = ['INCIDENT', 'COST', 'DEPLOYMENT'].includes(mode);

//   return (
//     <div className="flex justify-start mb-6 gap-3">
//       <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
//         <span className="text-white text-xs font-bold">AI</span>
//       </div>
//       <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
//         <div className="flex items-center gap-3">
//           <div className="flex gap-1">
//             {[0, 1, 2].map((i) => (
//               <div
//                 key={i}
//                 className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
//                 style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
//               />
//             ))}
//           </div>
//           <span className="text-xs text-gray-400">
//             {isLive ? 'Fetching live platform data...' : 'Thinking...'}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function EmptyState({ mode }: { mode: typeof MODES[0] }) {
//   const isLive = mode.contextSources.length > 0;

//   return (
//     <div className="flex flex-col items-center justify-center h-full text-center px-8">
//       <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mb-5 shadow-inner">
//         {mode.icon}
//       </div>
//       <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.label}</h3>
//       <p className="text-gray-500 text-sm mb-6 max-w-md leading-relaxed">{mode.description}</p>

//       <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-md w-full mb-4 shadow-sm">
//         <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Try asking</p>
//         <p className="text-sm text-gray-600 italic leading-relaxed">"{mode.placeholder}"</p>
//       </div>

//       {isLive && (
//         <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium ${MODE_COLORS[mode.color]}`}>
//           <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
//           Pulls live data from: {mode.contextSources.join(', ')}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Main page ──────────────────────────────────────────────────────────────

// export default function CopilotPage() {
//   const { user } = useAppSelector((s) => s.auth);
//   const [mode, setMode] = useState<CopilotMode>('CHAT');
//   const [messages, setMessages] = useState<DisplayMessage[]>([]);
//   const [input, setInput] = useState('');
//   const [serviceName, setServiceName] = useState('auth-service');
//   const [loading, setLoading] = useState(false);
//   const [configured, setConfigured] = useState<boolean | null>(null);
//   const [statusMessage, setStatusMessage] = useState('');
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLTextAreaElement>(null);

//   const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];

//   useEffect(() => { checkStatus(); }, []);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages, loading]);

//   useEffect(() => {
//     setMessages([]);
//     setInput('');
//     inputRef.current?.focus();
//   }, [mode]);

//   const checkStatus = async () => {
//     try {
//       const { data } = await copilotService.getStatus();
//       setConfigured(data.configured);
//       setStatusMessage(data.message);
//     } catch {
//       setConfigured(false);
//       setStatusMessage('AI Copilot service is offline. Run: docker compose up -d ai-copilot-service');
//     }
//   };

//   const sendMessage = async () => {
//     const trimmed = input.trim();
//     if (!trimmed || loading) return;

//     const userMsg: DisplayMessage = { role: 'user', content: trimmed };
//     const updatedMessages = [...messages, userMsg];
//     setMessages(updatedMessages);
//     setInput('');
//     setLoading(true);

//     try {
//       const history: ChatMessage[] = messages.map((m) => ({
//         role: m.role,
//         content: m.content,
//       }));

//       const { data } = await copilotService.chat({
//         mode,
//         message: trimmed,
//         history,
//         serviceName: mode === 'DEPLOYMENT' ? serviceName : undefined,
//       });

//       setMessages([
//         ...updatedMessages,
//         {
//           role: 'assistant',
//           content: data.content,
//           contextUsed: data.contextUsed,
//           tokensUsed: data.tokensUsed,
//           durationMs: data.durationMs,
//         },
//       ]);
//     } catch (err) {
//       const msg = err instanceof Error ? err.message : 'Unknown error';
//       setMessages([
//         ...updatedMessages,
//         {
//           role: 'assistant',
//           content: `**Error:** ${msg}\n\nMake sure the AI Copilot service is running and \`GROQ_API_KEY\` is configured in your \`.env\` file.`,
//           isError: true,
//         },
//       ]);
//     } finally {
//       setLoading(false);
//       setTimeout(() => inputRef.current?.focus(), 50);
//     }
//   };

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   // Auto-resize textarea
//   const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//     setInput(e.target.value);
//     e.target.style.height = 'auto';
//     e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       {/* ── Nav ─────────────────────────────────────────────────────────── */}
//       <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 z-10">
//         <Link to="/dashboard" className="flex items-center gap-2">
//           <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
//             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                 d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//             </svg>
//           </div>
//           <span className="font-semibold text-gray-900">IDP Platform</span>
//         </Link>
//         <span className="text-gray-300">/</span>
//         <span className="text-gray-600 font-medium">AI Copilot</span>

//         <div className="ml-auto flex items-center gap-3">
//           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
//             configured === true
//               ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
//               : configured === false
//               ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
//               : 'bg-gray-50 text-gray-500 border border-gray-200'
//           }`}>
//             <span className={`w-1.5 h-1.5 rounded-full ${
//               configured === true ? 'bg-emerald-500' :
//               configured === false ? 'bg-yellow-500' :
//               'bg-gray-400'
//             }`} />
//             {configured === true ? 'Groq Connected' :
//              configured === false ? 'Demo Mode' :
//              'Connecting...'}
//           </div>
//           <span className="text-sm text-gray-400 hidden md:block">{user?.email}</span>
//         </div>
//       </nav>

//       {/* ── Body ────────────────────────────────────────────────────────── */}
//       <div className="flex flex-1 overflow-hidden">
//         {/* ── Sidebar ─────────────────────────────────────────────────── */}
//         <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
//           <div className="p-4">
//             <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mode</p>
//             <div className="space-y-1">
//               {MODES.map((m) => (
//                 <button
//                   key={m.id}
//                   onClick={() => setMode(m.id)}
//                   className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
//                     mode === m.id
//                       ? `${MODE_ACTIVE_COLORS[m.color]} border`
//                       : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
//                   }`}
//                 >
//                   <div className="flex items-center gap-2.5">
//                     <span className="text-xl shrink-0">{m.icon}</span>
//                     <div>
//                       <p className={`text-sm font-medium ${mode === m.id ? 'text-gray-900' : 'text-gray-700'}`}>
//                         {m.label}
//                       </p>
//                       <p className="text-xs text-gray-400 leading-tight mt-0.5">{m.description}</p>
//                     </div>
//                   </div>
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Context sources */}
//           {currentMode.contextSources.length > 0 && (
//             <div className="px-4 py-3 border-t border-gray-100 mt-auto">
//               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Context</p>
//               <div className="space-y-1">
//                 {currentMode.contextSources.map((src) => (
//                   <div key={src} className="flex items-center gap-2">
//                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
//                     <span className="text-xs text-gray-500">{src}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Conversation controls */}
//           {messages.length > 0 && (
//             <div className="p-4 border-t border-gray-100">
//               <button
//                 onClick={() => setMessages([])}
//                 className="w-full px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
//               >
//                 ↺ Clear conversation
//               </button>
//             </div>
//           )}
//         </aside>

//         {/* ── Main ────────────────────────────────────────────────────── */}
//         <main className="flex-1 flex flex-col overflow-hidden">
//           {/* Status banner */}
//           {configured === false && (
//             <div className="px-6 py-2.5 bg-yellow-50 border-b border-yellow-200 shrink-0">
//               <p className="text-xs text-yellow-800">⚠️ {statusMessage}</p>
//             </div>
//           )}

//           {/* Deployment mode — service name input */}
//           {mode === 'DEPLOYMENT' && (
//             <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 shrink-0 flex items-center gap-3">
//               <label className="text-sm font-medium text-purple-700 shrink-0">Service:</label>
//               <input
//                 value={serviceName}
//                 onChange={(e) => setServiceName(e.target.value)}
//                 placeholder="e.g. auth-service"
//                 className="px-3 py-1.5 text-sm border border-purple-200 rounded-lg bg-white
//                            focus:outline-none focus:ring-2 focus:ring-purple-400 w-48"
//               />
//               <p className="text-xs text-purple-500">
//                 Live metrics for this service will be sent as context to the AI
//               </p>
//             </div>
//           )}

//           {/* Messages area */}
//           <div className="flex-1 overflow-y-auto">
//             <div className="max-w-4xl mx-auto px-6 py-6">
//               {messages.length === 0 ? (
//                 <div className="h-full min-h-96 flex items-center justify-center">
//                   <EmptyState mode={currentMode} />
//                 </div>
//               ) : (
//                 <>
//                   {messages.map((msg, idx) =>
//                     msg.role === 'user'
//                       ? <UserBubble key={idx} content={msg.content} />
//                       : <AssistantBubble key={idx} message={msg} />
//                   )}
//                   {loading && <TypingIndicator mode={mode} />}
//                   <div ref={messagesEndRef} />
//                 </>
//               )}
//             </div>
//           </div>

//           {/* Input area */}
//           <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
//             <div className="max-w-4xl mx-auto">
//               <div className="flex gap-3 items-end">
//                 <div className="flex-1 relative">
//                   <textarea
//                     ref={inputRef}
//                     value={input}
//                     onChange={handleInput}
//                     onKeyDown={handleKeyDown}
//                     placeholder={currentMode.placeholder}
//                     rows={1}
//                     disabled={loading}
//                     className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none
//                                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
//                                text-sm text-gray-800 placeholder:text-gray-400
//                                disabled:bg-gray-50 disabled:text-gray-400
//                                transition-shadow leading-relaxed"
//                     style={{ minHeight: '48px', maxHeight: '160px' }}
//                   />
//                 </div>
//                 <button
//                   onClick={sendMessage}
//                   disabled={!input.trim() || loading}
//                   className="px-5 py-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800
//                              disabled:opacity-40 disabled:cursor-not-allowed
//                              text-white rounded-xl transition-colors shrink-0
//                              text-sm font-medium shadow-sm"
//                 >
//                   {loading ? (
//                     <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                     </svg>
//                   ) : (
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                         d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
//                     </svg>
//                   )}
//                 </button>
//               </div>
//               <div className="flex items-center justify-between mt-2 px-1">
//                 <p className="text-xs text-gray-300">
//                   ⏎ Send &nbsp;·&nbsp; Shift+⏎ New line
//                 </p>
//                 <p className="text-xs text-gray-300">
//                   {configured ? `llama3-70b-8192 via Groq` : 'Demo mode'}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  copilotService,
  CopilotMode,
} from '../../services/copilot.service';
import { useCopilotHistory, StoredMessage } from '../../hooks/useCopilotHistory';

// ── Mode config ────────────────────────────────────────────────────────────

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

// ── Markdown styles (shared) ───────────────────────────────────────────────

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
  prose-th:border prose-th:border-gray-200 prose-th:px-3 prose-th:py-2 prose-th:text-left
  prose-th:font-semibold prose-th:text-gray-700
  prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2
  prose-td:text-gray-600 prose-td:align-top
  prose-tr:even:bg-gray-50
  prose-a:text-primary-600 prose-a:underline
  prose-hr:border-gray-200 prose-hr:my-4`;

// ── Sub-components ─────────────────────────────────────────────────────────

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
      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700
                      flex items-center justify-center shadow-sm mt-0.5">
        <span className="text-white text-xs font-bold">AI</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`rounded-2xl rounded-tl-md px-5 py-4 shadow-sm border ${
          message.isError ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
        }`}>
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-1.5 px-1 flex-wrap">
          <span className="text-xs text-gray-300">{time}</span>
          {message.contextUsed && message.contextUsed.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-400">
                Live: <span className="text-emerald-600 font-medium">{message.contextUsed.join(', ')}</span>
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
      </div>
    </div>
  );
}

function TypingIndicator({ mode }: { mode: CopilotMode }) {
  const isLive = ['INCIDENT', 'COST', 'DEPLOYMENT'].includes(mode);
  return (
    <div className="flex justify-start mb-5 gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700
                      flex items-center justify-center shadow-sm">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }} />
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {isLive ? 'Fetching live platform data...' : 'Thinking...'}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ mode }: { mode: typeof MODES[0] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mb-5 shadow-inner">
        {mode.icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.label}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-md leading-relaxed">{mode.description}</p>
      <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-md w-full mb-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Try asking</p>
        <p className="text-sm text-gray-600 italic leading-relaxed">"{mode.placeholder}"</p>
      </div>
      {mode.contextSources.length > 0 && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium ${mode.badgeColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          Pulls live data from: {mode.contextSources.join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<CopilotMode>('CHAT');
  const [input, setInput] = useState('');
  const [serviceName, setServiceName] = useState('auth-service');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const { messages, addMessage, clearHistory, clearAllHistory, estimatedTokens } =
    useCopilotHistory(mode);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  useEffect(() => { checkStatus(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // When switching mode, clear input and refocus
  const handleModeSwitch = (newMode: CopilotMode) => {
    setMode(newMode);
    setInput('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
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

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Add user message to persistent history
    addMessage({ role: 'user', content: trimmed });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    try {
      // Build history for context (exclude the message we just added)
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data } = await copilotService.chat({
        mode,
        message: trimmed,
        history: historyForApi,
        serviceName: mode === 'DEPLOYMENT' ? serviceName : undefined,
      });

      addMessage({
        role: 'assistant',
        content: data.content,
        contextUsed: data.contextUsed,
        tokensUsed: data.tokensUsed,
        durationMs: data.durationMs,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addMessage({
        role: 'assistant',
        content: `**Error:** ${msg}\n\nMake sure the AI Copilot service is running and \`GROQ_API_KEY\` is configured.`,
        isError: true,
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

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

  // History stats for all modes
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
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
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
            configured === true  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            configured === false ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                   'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              configured === true ? 'bg-emerald-500' :
              configured === false ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
            {configured === true ? 'Groq Connected' :
             configured === false ? 'Demo Mode' : 'Connecting...'}
          </div>
          <span className="text-sm text-gray-400 hidden md:block">{user?.email}</span>
        </div>
      </nav>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">

          {/* Mode selector */}
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mode</p>
            <div className="space-y-1">
              {MODES.map((m) => {
                const stat = historyStats.find((s) => s.mode === m.id);
                const msgCount = stat?.count ?? 0;
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
                          <p className={`text-sm font-medium ${mode === m.id ? 'text-primary-700' : 'text-gray-700'}`}>
                            {m.label}
                          </p>
                          {msgCount > 0 && (
                            <span className="text-xs text-gray-400 shrink-0 ml-1">
                              {msgCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">{m.description}</p>
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

          {/* History controls */}
          <div className="p-4 border-t border-gray-100 mt-auto space-y-2">
            {/* Token usage indicator */}
            {estimatedTokens > 0 && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Context used</span>
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
                  <p className="text-xs text-orange-500 mt-1">
                    History is long — consider clearing soon
                  </p>
                )}
              </div>
            )}

            <button
              onClick={clearHistory}
              disabled={messages.length === 0}
              className="w-full px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg
                         hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
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

        {/* ── Main chat area ───────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Status banner */}
          {configured === false && (
            <div className="px-6 py-2.5 bg-yellow-50 border-b border-yellow-200 shrink-0">
              <p className="text-xs text-yellow-800">⚠️ {statusMessage}</p>
            </div>
          )}

          {/* Deployment — service name picker */}
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
                  {/* History label at top */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 shrink-0">
                      {messages.length} messages · history saved locally
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {messages.map((msg, idx) =>
                    msg.role === 'user'
                      ? <UserBubble key={idx} content={msg.content} />
                      : <AssistantBubble key={idx} message={msg} />
                  )}

                  {loading && <TypingIndicator mode={mode} />}
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
                               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                               text-sm text-gray-800 placeholder:text-gray-400
                               disabled:bg-gray-50 disabled:text-gray-400 transition-shadow leading-relaxed"
                    style={{ minHeight: '48px', maxHeight: '160px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="px-5 py-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                             disabled:opacity-40 disabled:cursor-not-allowed
                             text-white rounded-xl transition-colors shrink-0 shadow-sm"
                >
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-xs text-gray-300">⏎ Send · Shift+⏎ New line</p>
                <p className="text-xs text-gray-300">
                  {configured ? 'llama3-70b-8192 via Groq' : 'Demo mode'}
                  {messages.length > 0 && ` · ${messages.length} messages in history`}
                </p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
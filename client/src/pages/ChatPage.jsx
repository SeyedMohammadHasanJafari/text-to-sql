import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Shield,
  Code2,
  Languages,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  Bot,
  Trash2,
  RotateCcw,
  Square,
  Edit3,
  MessageSquare,
} from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { InteractiveChart } from '../components/charts/InteractiveChart.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';

export function ChatPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState(new Set());
  const [copiedSqlId, setCopiedSqlId] = useState(null);
  const [pinnedSourceIds, setPinnedSourceIds] = useState(new Set());
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [inputDir, setInputDir] = useState('ltr');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentPendingPromptRef = useRef('');
  const dropdownRef = useRef(null);

  // Auto-detect Persian/Arabic characters based on dominant character script
  const isPersian = (text) => {
    if (!text) return false;
    const clean = String(text);
    const persianCount = (clean.match(/[\u0600-\u06FF]/g) || []).length;
    const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;
    if (persianCount > latinCount) return true;
    if (latinCount > 0) return false;
    return persianCount > 0;
  };

  // Extract first 3 words for auto-titling
  const extractFirstThreeWords = (text) => {
    const words = (text || '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 3).join(' ') || 'New chat';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Close custom session dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSessionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load user's dashboard pins to synchronize pinned status
  const loadDashboardPins = async () => {
    try {
      const res = await apiFetch('/api/dashboard/pins');
      if (res?.pins) {
        const ids = new Set(res.pins.map((p) => p.sourceMessageId).filter(Boolean));
        setPinnedSourceIds(ids);
      }
    } catch {
      // ignore pin fetch errors
    }
  };

  useEffect(() => {
    loadDashboardPins();
  }, []);

  // Load chat sessions on mount
  useEffect(() => {
    let mounted = true;
    async function loadSessions() {
      try {
        const res = await apiFetch('/api/chat/sessions');
        if (mounted && res?.sessions) {
          setSessions(res.sessions);
          if (res.sessions.length > 0) {
            setActiveSessionId(res.sessions[0].id);
          } else {
            // Create default initial session
            const newRes = await apiFetch('/api/chat/sessions', {
              method: 'POST',
              body: { title: 'New chat' },
            });
            if (mounted && newRes?.session) {
              setSessions([newRes.session]);
              setActiveSessionId(newRes.session.id);
            }
          }
        }
      } catch {
        // user may not be logged in or network error
      }
    }

    loadSessions();
    return () => {
      mounted = false;
    };
  }, []);

  // Load messages whenever activeSessionId changes
  useEffect(() => {
    let mounted = true;
    if (!activeSessionId) return;

    async function loadSessionMessages() {
      try {
        setLoadingHistory(true);
        const res = await apiFetch(`/api/chat/sessions/${activeSessionId}`);
        if (mounted && res?.session?.messages) {
          setMessages(res.session.messages);
        }
      } catch {
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }

    loadSessionMessages();
    return () => {
      mounted = false;
    };
  }, [activeSessionId]);

  const handleCreateNewSession = async () => {
    // 1. If currently active session has 0 messages, just stay here!
    if (messages.length === 0) {
      setSessionDropdownOpen(false);
      inputRef.current?.focus();
      return;
    }

    // 2. Check if an empty session already exists in sessions list
    const existingEmpty = sessions.find((s) => Number(s.messageCount) === 0);
    if (existingEmpty) {
      setActiveSessionId(existingEmpty.id);
      setSessionDropdownOpen(false);
      inputRef.current?.focus();
      return;
    }

    // 3. Otherwise, create a new session
    try {
      const res = await apiFetch('/api/chat/sessions', {
        method: 'POST',
        body: { title: 'New chat' },
      });
      if (res?.session) {
        setSessions((prev) => {
          const exists = prev.some((s) => s.id === res.session.id);
          return exists ? prev : [res.session, ...prev];
        });
        setActiveSessionId(res.session.id);
        setMessages([]);
        setSessionDropdownOpen(false);
        inputRef.current?.focus();
      }
    } catch (err) {
      alert(err.message || 'Failed to create new chat');
    }
  };

  // Delete a session
  const handleDeleteSession = async (sessionIdToDelete, e) => {
    if (e) e.stopPropagation();
    const id = sessionIdToDelete || activeSessionId;
    if (!id) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this chat session? All messages in this conversation will be permanently removed.'
    );
    if (!confirmDelete) return;

    try {
      await apiFetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);

      if (id === activeSessionId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          // Create a fresh new chat session
          const newRes = await apiFetch('/api/chat/sessions', {
            method: 'POST',
            body: { title: 'New chat' },
          });
          if (newRes?.session) {
            setSessions([newRes.session]);
            setActiveSessionId(newRes.session.id);
            setMessages([]);
          }
        }
      }
      setSessionDropdownOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to delete chat session');
    }
  };

  // Clear all messages in current session
  const handleClearMessages = async () => {
    if (!activeSessionId || messages.length === 0) return;
    const confirmClear = window.confirm(
      'Are you sure you want to clear all messages in this conversation?'
    );
    if (!confirmClear) return;

    try {
      await apiFetch(`/api/chat/sessions/${activeSessionId}/messages`, { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      alert(err.message || 'Failed to clear messages');
    }
  };

  // Delete an individual message
  const handleDeleteMessage = async (msgId) => {
    if (!activeSessionId || !msgId) return;
    try {
      await apiFetch(`/api/chat/sessions/${activeSessionId}/messages/${msgId}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // Handle input typing and auto-direction
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (val.trim()) {
      setInputDir(isPersian(val) ? 'rtl' : 'ltr');
    }
  };

  // Stop/Cancel generation in flight
  const handleStopGeneration = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeSessionId) {
      apiFetch(`/api/chat/sessions/${activeSessionId}/stop`, { method: 'POST', body: {} }).catch(() => { });
    }
    setIsThinking(false);

    // Put prompt back into input for editing/resending
    if (currentPendingPromptRef.current) {
      const restored = currentPendingPromptRef.current;
      setInput(restored);
      setInputDir(isPersian(restored) ? 'rtl' : 'ltr');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }

    // Filter out the last temporary user message
    setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
  };

  // Edit an existing prompt
  const handleEditPrompt = (promptContent) => {
    setInput(promptContent);
    setInputDir(isPersian(promptContent) ? 'rtl' : 'ltr');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    scrollToBottom();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId || isThinking) return;

    const userText = input.trim();
    currentPendingPromptRef.current = userText;
    const isUserPersian = isPersian(userText);
    setInputDir(isUserPersian ? 'rtl' : 'ltr');
    setInput('');

    // Setup AbortController for cancelable fetch
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Optimistic UI update
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsThinking(true);

    try {
      const res = await apiFetch(`/api/chat/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        body: { content: userText },
        signal: controller.signal,
      });

      if (res?.assistantMessage) {
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => m.id !== tempUserMsg.id && m.id !== res.userMessage?.id && m.id !== res.assistantMessage?.id
          );
          return [...filtered, res.userMessage, res.assistantMessage];
        });

        // Auto-expand SQL accordion for transparency
        if (res.assistantMessage.sqlQuery) {
          setExpandedSqlIds((prev) => new Set([...prev, res.assistantMessage.id]));
        }

        // Auto-update session title with first 3 words of prompt
        const newTitle = res.sessionTitle || extractFirstThreeWords(userText);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                ...s,
                title: newTitle,
                messageCount: (Number(s.messageCount) || 0) + 2,
              }
              : s
          )
        );

        // Refresh dashboard pins
        loadDashboardPins();
      }
    } catch (err) {
      if (
        err.name === 'AbortError' ||
        err.status === 499 ||
        err.code === 'CLIENT_ABORTED' ||
        err.message?.includes('Generation stopped by user')
      ) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: isPersian(userText)
            ? `متأسفانه در تحلیل درخواست شما خطایی رخ داد: ${err.message}`
            : `An error occurred while executing the analysis: ${err.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const toggleSqlExpand = (msgId) => {
    setExpandedSqlIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const copySql = (msgId, sql) => {
    navigator.clipboard.writeText(sql);
    setCopiedSqlId(msgId);
    setTimeout(() => setCopiedSqlId(null), 2000);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const samplePrompts = [
    {
      title: 'Top Product Categories',
      text: 'What are the top 5 product categories by total revenue?',
      category: 'Inventory',
    },
    {
      title: 'Monthly Sales Trends',
      text: 'Which month had the highest revenue and what is the sales trend?',
      category: 'Financial',
    },
    {
      title: 'Top Customer Volume',
      text: 'List the top 10 customers by total spend and plot a bar chart',
      category: 'Customers',
    },
    {
      title: 'Bilingual Query (فارسی)',
      text: 'مجموع فروش هر دسته‌بندی چقدر است؟ نمودار میله‌ای رسم کن',
      category: 'Bilingual',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0b1120]">
      {/* Top Bar: Enhanced Session Dropdown & Status Controls */}
      <div className="relative z-40 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Custom Styled Session Selector Dropdown */}
          <div className="relative z-50" ref={dropdownRef}>
            <button
              onClick={() => setSessionDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:border-indigo-500/50 transition-all cursor-pointer max-w-[200px] sm:max-w-[260px]"
            >
              <MessageSquare className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span
                className={`truncate text-left ${isPersian(activeSession?.title) ? 'font-persian' : 'font-sans'
                  }`}
              >
                {activeSession?.title || 'Select session'}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${sessionDropdownOpen ? 'rotate-180 text-indigo-500' : ''
                  }`}
              />
            </button>

            {/* Dropdown Menu Modal */}
            <AnimatePresence>
              {sessionDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-1.5 w-[calc(100vw-2.5rem)] sm:w-80 max-w-sm rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                >
                  <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Conversations ({sessions.length})
                    </span>
                    <button
                      onClick={handleCreateNewSession}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Chat</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                    {sessions.map((s) => {
                      const isSelected = s.id === activeSessionId;
                      const sIsPersian = isPersian(s.title);

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setSessionDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer group ${isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <MessageSquare
                              className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                }`}
                            />
                            <div className="min-w-0">
                              <p className={`truncate ${sIsPersian ? 'font-persian' : 'font-sans'}`}>
                                {s.title}
                              </p>
                              {s.createdAt && (
                                <p className="text-[10px] text-slate-400 font-normal">
                                  {new Date(s.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                            title="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New Chat Quick Button */}
          <button
            onClick={handleCreateNewSession}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Start new chat"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* Delete Current Session */}
          <button
            onClick={() => handleDeleteSession(activeSessionId)}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            title="Delete this chat session"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Delete Session</span>
          </button>

          {/* Clear Messages in Current Session */}
          {messages.length > 0 && (
            <button
              onClick={handleClearMessages}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              title="Clear all messages in this conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Clear Messages</span>
            </button>
          )}
        </div>

        {/* Right Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
            <Shield className="h-3.5 w-3.5" />
            <span>Read-Only Sandbox (SELECT Only)</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Languages className="h-3.5 w-3.5 text-indigo-400" />
            <span>Auto RTL/LTR</span>
          </div>
        </div>
      </div>

      {/* Message Feed / Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
        {loadingHistory ? (
          <div className="h-full flex flex-col justify-center items-center text-slate-400 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-xs">Loading conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div className="h-full flex flex-col justify-center items-center text-center py-12 px-4">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-indigo-500 to-purple-600 p-0.5 shadow-2xl shadow-indigo-500/20 mb-6">
              <div className="h-full w-full rounded-[22px] bg-white dark:bg-[#0f172a] flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-indigo-500" />
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Chat with Your Data
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mb-8 leading-relaxed">
              Ask analytical questions in English or Persian. The AI agent inspects your tables, writes safe SQL,
              executes queries in your sandboxed Postgres schema, and returns interactive visual insights.
            </p>

            {/* Sample Prompts Grid */}
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(p.text);
                    inputRef.current?.focus();
                  }}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-indigo-500/50 transition-all text-left group cursor-pointer shadow-sm"
                  dir={isPersian(p.text) ? 'rtl' : 'ltr'}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {p.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{p.title}</span>
                  </div>
                  <p
                    className={`text-xs text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 ${isPersian(p.text) ? 'font-persian' : 'font-sans'
                      }`}
                  >
                    {p.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat History Feed */
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const msgIsPersian = isPersian(msg.content);
                const msgDir = msgIsPersian ? 'rtl' : 'ltr';
                const isAssistant = msg.role === 'assistant';
                const isExpanded = expandedSqlIds.has(msg.id);
                const isPinned = pinnedSourceIds.has(msg.id);

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={`flex gap-3 group/msg ${!isAssistant ? 'justify-end' : 'justify-start w-full'}`}
                  >
                    {isAssistant && (
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md mt-0.5">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div className={`flex flex-col min-w-0 ${isAssistant ? 'w-full' : 'max-w-xl sm:max-w-2xl'}`}>
                      <div
                        className={`rounded-2xl p-4 sm:p-5 shadow-sm transition-all relative w-full ${!isAssistant
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                          }`}
                        dir={msgDir}
                      >
                        {isAssistant ? (
                          <div
                            className={`text-sm leading-relaxed break-words ${msgIsPersian ? 'font-persian' : 'font-sans'
                              }`}
                          >
                            <Markdown
                              components={{
                                p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
                                strong: ({ children }) => (
                                  <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc list-inside space-y-1.5 my-2 ps-1">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal list-inside space-y-1.5 my-2 ps-1">{children}</ol>
                                ),
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                code: ({ inline, children }) =>
                                  inline ? (
                                    <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-indigo-600 dark:text-indigo-400">
                                      {children}
                                    </code>
                                  ) : (
                                    <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto my-2" dir="ltr">
                                      <code>{children}</code>
                                    </pre>
                                  ),
                              }}
                            >
                              {msg.content}
                            </Markdown>
                          </div>
                        ) : (
                          <p
                            className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${msgIsPersian ? 'font-persian' : 'font-sans'
                              }`}
                          >
                            {msg.content}
                          </p>
                        )}

                        {/* Collapsible SQL Block */}
                        {msg.sqlQuery && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80" dir="ltr">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => toggleSqlExpand(msg.id)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <Code2 className="h-3.5 w-3.5" />
                                <span>SQL Executed (Sandbox)</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => copySql(msg.id, msg.sqlQuery)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                                title="Copy SQL"
                              >
                                {copiedSqlId === msg.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <pre className="mt-2 p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                                    <code>{msg.sqlQuery}</code>
                                  </pre>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Interactive Recharts Graph with Synchronized Pin State */}
                        {msg.chartData && (
                          <div className="mt-3">
                            <InteractiveChart
                              chartData={msg.chartData}
                              sqlQuery={msg.sqlQuery}
                              sourceMessageId={msg.id}
                              isPinned={isPinned}
                              onPinSuccess={() => {
                                setPinnedSourceIds((prev) => new Set([...prev, msg.id]));
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Bar for Messages: Edit prompt, Delete message */}
                      <div
                        className={`flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity text-[11px] ${!isAssistant ? 'justify-end' : 'justify-start'
                          }`}
                      >
                        {!isAssistant && (
                          <button
                            onClick={() => handleEditPrompt(msg.content)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit and resend prompt"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit prompt</span>
                          </button>
                        )}

                        {!msg.id.startsWith('temp-') && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {!isAssistant && (
                      <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0">
                        {user?.displayName?.[0] || 'U'}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Skeleton / Thinking State with Stop Generation Button */}
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-3 justify-start items-center"
                >
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Bot className="h-4 w-4 animate-bounce" />
                  </div>
                  <div className="rounded-2xl p-4 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 flex-wrap">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                      Analyzing schema, generating SQL & executing in Postgres sandbox...
                    </span>

                    {/* Stop Generation Button */}
                    <button
                      type="button"
                      onMouseDown={handleStopGeneration}
                      onClick={handleStopGeneration}
                      className="ml-auto sm:ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 z-20"
                      title="Stop generating response"
                    >
                      <Square className="h-3 w-3 fill-rose-500" />
                      <span>Stop generation</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form with Auto-RTL Detection and Stop Generation Control */}
      <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              readOnly={isThinking}
              onChange={handleInputChange}
              dir={input ? (isPersian(input) ? 'rtl' : 'ltr') : inputDir}
              placeholder="Ask a question about your data (English or فارسی)..."
              className={`w-full rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/70 py-3.5 pl-4 pr-14 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner transition-all ${isThinking ? 'opacity-60 cursor-not-allowed' : ''
                } ${(input ? isPersian(input) : inputDir === 'rtl')
                  ? 'font-persian pr-4 pl-24'
                  : 'font-sans pr-24 pl-4'
                }`}
            />

            <div
              className={`absolute ${(input ? isPersian(input) : inputDir === 'rtl') ? 'left-2.5' : 'right-2.5'
                } flex items-center gap-1.5 z-30`}
            >
              {isThinking ? (
                <button
                  type="button"
                  onMouseDown={handleStopGeneration}
                  onClick={handleStopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer z-30 active:scale-95"
                  title="Stop generating response"
                >
                  <Square className="h-3.5 w-3.5 fill-white" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer z-30"
                  title="Send query"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

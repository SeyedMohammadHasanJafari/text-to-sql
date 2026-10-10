import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Pin,
  Trash2,
  Code2,
  Calendar,
  MessageSquare,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { InteractiveChart } from '../components/charts/InteractiveChart.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export function DashboardPage() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSqlPins, setExpandedSqlPins] = useState(new Set());
  const [copiedPinId, setCopiedPinId] = useState(null);
  const navigate = useNavigate();

  const loadPins = async () => {
    try {
      const data = await apiFetch('/api/dashboard/pins');
      setPins(data?.pins || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load pinned charts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/dashboard/pins')
      .then((data) => {
        if (mounted) {
          setPins(data?.pins || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load pinned charts');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleUnpin = async (pinId) => {
    if (!window.confirm('Are you sure you want to remove this chart from your dashboard?')) {
      return;
    }

    try {
      await apiFetch(`/api/dashboard/pins/${pinId}`, { method: 'DELETE' });
      setPins((prev) => prev.filter((p) => p.id !== pinId));
    } catch (err) {
      alert(err.message || 'Failed to unpin chart');
    }
  };

  const toggleSql = (pinId) => {
    setExpandedSqlPins((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  };

  const copySql = (pinId, sql) => {
    navigator.clipboard.writeText(sql);
    setCopiedPinId(pinId);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-indigo-500" />
            <span>Visual Analytics Dashboard</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pinned insights and charts from your chat sessions saved in an independent, persistent grid.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 font-semibold">
            {pins.length} Pinned {pins.length === 1 ? 'Chart' : 'Charts'}
          </span>

          <button
            onClick={loadPins}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-4 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Main Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-xs">Loading pinned dashboard charts...</p>
        </div>
      ) : pins.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-16 text-center bg-white/40 dark:bg-slate-900/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4">
            <Pin className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No pinned charts yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            When you ask questions in the chat, click the &quot;Pin 📌&quot; icon on any generated chart
            to organize your key business metrics here.
          </p>

          <button
            onClick={() => navigate('/chat')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Go to Chat & Analytics</span>
          </button>
        </div>
      ) : (
        /* Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {pins.map((pin) => {
              const isSqlExpanded = expandedSqlPins.has(pin.id);

              return (
                <motion.div
                  key={pin.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25 }}
                  className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 group backdrop-blur-sm"
                >
                  {/* Card Top Actions */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-xs ${
                          /[\u0600-\u06FF]/.test(pin.title || '') ? 'font-persian' : 'font-sans'
                        }`}
                        dir={/[\u0600-\u06FF]/.test(pin.title || '') ? 'rtl' : 'ltr'}
                      >
                        {pin.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {pin.sqlQuery && (
                        <button
                          onClick={() => toggleSql(pin.id)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View SQL query"
                        >
                          <Code2 className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleUnpin(pin.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Unpin chart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Collapsible SQL Block */}
                  <AnimatePresence>
                    {isSqlExpanded && pin.sqlQuery && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden p-3 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 relative"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">
                            SQL Query
                          </span>
                          <button
                            onClick={() => copySql(pin.id, pin.sqlQuery)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copy query"
                          >
                            {copiedPinId === pin.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <pre className="text-[11px] leading-relaxed overflow-x-auto">
                          <code>{pin.sqlQuery}</code>
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Render Chart */}
                  <div className="flex-1">
                    <InteractiveChart
                      chartData={pin.chartData}
                      sqlQuery={pin.sqlQuery}
                      showPinButton={false}
                    />
                  </div>

                  {/* Card Footer Info */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Pinned on {new Date(pin.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => toggleSql(pin.id)}
                      className="flex items-center gap-1 hover:text-indigo-500 transition-colors cursor-pointer"
                    >
                      <span>{isSqlExpanded ? 'Hide SQL' : 'Show SQL'}</span>
                      {isSqlExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

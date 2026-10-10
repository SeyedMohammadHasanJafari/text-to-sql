import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { motion } from 'framer-motion';

export function SemanticLayerModal({ datasetId, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('semantic'); // 'semantic' | 'preview'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dataset, setDataset] = useState(null);
  const [descriptions, setDescriptions] = useState({});

  useEffect(() => {
    let mounted = true;
    async function loadDataset() {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch(`/api/datasets/${datasetId}`);
        if (mounted && res?.dataset) {
          setDataset(res.dataset);
          const initialDesc = {};
          for (const col of res.dataset.columns || []) {
            initialDesc[col.id] = col.semanticDescription || '';
          }
          setDescriptions(initialDesc);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load dataset details');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (datasetId) {
      loadDataset();
    }
    return () => {
      mounted = false;
    };
  }, [datasetId]);

  const handleDescriptionChange = (colId, value) => {
    setDescriptions((prev) => ({
      ...prev,
      [colId]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const updates = Object.entries(descriptions).map(([id, semanticDescription]) => ({
        id,
        semanticDescription: semanticDescription.trim() || null,
      }));

      await apiFetch(`/api/datasets/${datasetId}/columns`, {
        method: 'PATCH',
        body: { columns: updates },
      });

      setSuccess('Semantic layer descriptions saved! The AI agent will use this context in queries.');
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || 'Failed to save semantic descriptions');
    } finally {
      setSaving(false);
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'integer':
      case 'bigint':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/50';
      case 'numeric':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50';
      case 'date':
      case 'timestamptz':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/50';
      case 'boolean':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50';
      case 'text':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  if (!datasetId) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-base font-bold text-slate-900 dark:text-white ${
                    /[\u0600-\u06FF]/.test(dataset?.originalFilename || '') ? 'font-persian' : 'font-sans'
                  }`}
                  dir={/[\u0600-\u06FF]/.test(dataset?.originalFilename || '') ? 'rtl' : 'ltr'}
                >
                  {dataset?.originalFilename || 'Dataset Configuration'}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {dataset?.tableName}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dataset?.rowCount?.toLocaleString() ?? 0} rows in PostgreSQL sandbox schema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-200/80 dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('semantic')}
            className={`flex items-center gap-2 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'semantic'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Semantic Layer (Column Definitions)</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>Data Preview (Sample Rows)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-4 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-4 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <div>{success}</div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-xs">Loading schema from PostgreSQL sandbox...</p>
            </div>
          ) : activeTab === 'semantic' ? (
            /* Semantic Layer Tab */
            <div className="space-y-4">
              <div className="rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-4 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <strong>Why add semantic descriptions?</strong> The AI agent uses these explanations
                inside its system prompt to understand business context (e.g. defining that{' '}
                <code>rev_usd</code> means &quot;Total Net Revenue&quot; or that <code>status = 1</code> means
                &quot;Active Customer&quot;).
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {dataset?.columns?.map((col) => (
                  <div
                    key={col.id}
                    className="p-4 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Column Info */}
                    <div className="sm:w-1/3 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-xs text-slate-900 dark:text-white truncate ${
                            /[\u0600-\u06FF]/.test(col.originalName) ? 'font-persian' : 'font-sans'
                          }`}
                        >
                          {col.originalName}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${getTypeBadgeColor(
                            col.dataType,
                          )}`}
                        >
                          {col.dataType}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        SQL: {col.columnName}
                      </p>
                    </div>

                    {/* Description Input */}
                    <div className="sm:w-2/3">
                      <input
                        type="text"
                        value={descriptions[col.id] || ''}
                        onChange={(e) => handleDescriptionChange(col.id, e.target.value)}
                        dir={/[\u0600-\u06FF]/.test(descriptions[col.id] || '') ? 'rtl' : 'ltr'}
                        placeholder="e.g. Total revenue after discount..."
                        className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                          /[\u0600-\u06FF]/.test(descriptions[col.id] || '') ? 'font-persian' : 'font-sans'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Data Preview Tab */
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Displaying first 15 records from the sandboxed table:
              </p>

              {dataset?.sampleRows && dataset.sampleRows.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        {dataset.columns?.map((col) => (
                          <th key={col.id} className="px-3.5 py-2.5 font-semibold">
                            {col.columnName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {dataset.sampleRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          {dataset.columns?.map((col) => (
                            <td key={col.id} className="px-3.5 py-2 whitespace-nowrap">
                              {row[col.columnName] !== null && row[col.columnName] !== undefined
                                ? String(row[col.columnName])
                                : <span className="text-slate-400 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                  No preview records available.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {dataset?.columns?.length || 0} columns detected
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {activeTab === 'semantic' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{saving ? 'Saving...' : 'Save Semantic Layer'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

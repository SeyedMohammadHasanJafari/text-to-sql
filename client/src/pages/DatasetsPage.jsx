import { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Sparkles,
  Trash2,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { FileUploadDropzone } from '../components/datasets/FileUploadDropzone.jsx';
import { SemanticLayerModal } from '../components/datasets/SemanticLayerModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export function DatasetsPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [showUpload, setShowUpload] = useState(true);

  const loadDatasets = async () => {
    try {
      const data = await apiFetch('/api/datasets');
      setDatasets(data?.datasets || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/datasets')
      .then((data) => {
        if (mounted) {
          setDatasets(data?.datasets || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load datasets');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = async (datasetId, tableName) => {
    if (!window.confirm(`Are you sure you want to delete table "${tableName}" from your PostgreSQL sandbox?`)) {
      return;
    }

    try {
      await apiFetch(`/api/datasets/${datasetId}`, { method: 'DELETE' });
      setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
    } catch (err) {
      alert(err.message || 'Failed to delete dataset');
    }
  };

  const handleUploadSuccess = (newDataset) => {
    setDatasets((prev) => [newDataset, ...prev]);
    // Automatically open semantic layer editor for the newly ingested dataset
    setActiveDatasetId(newDataset.id);
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Data Ingestion & Semantic Layer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload CSV or Excel files. Each file becomes a physical table in your sandbox with customizable semantic descriptions.
          </p>
        </div>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>{showUpload ? 'Hide Dropzone' : 'Upload New File'}</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <FileUploadDropzone onUploadSuccess={handleUploadSuccess} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-4 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Datasets Table & List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="h-5 w-5 text-indigo-500" />
            <span>Active Datasets in Sandbox</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
              {datasets.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-xs">Fetching datasets from PostgreSQL...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/40 dark:bg-slate-900/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              No datasets uploaded yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Use the dropzone above to ingest your first CSV or Excel file.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {datasets.map((dataset) => (
                <motion.div
                  key={dataset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/10 to-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Database className="h-5 w-5" />
                        </div>
                        <div>
                          <h3
                            className={`font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs ${
                              /[\u0600-\u06FF]/.test(dataset.originalFilename || '') ? 'font-persian' : 'font-sans'
                            }`}
                            dir={/[\u0600-\u06FF]/.test(dataset.originalFilename || '') ? 'rtl' : 'ltr'}
                          >
                            {dataset.originalFilename}
                          </h3>
                          <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {dataset.tableName}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(dataset.id, dataset.tableName)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete dataset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <Layers className="h-3.5 w-3.5" />
                        {dataset.rowCount?.toLocaleString() ?? 0} rows
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(dataset.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {dataset.columns?.length || 0} columns
                    </span>

                    <button
                      onClick={() => setActiveDatasetId(dataset.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Semantic Layer & Preview</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Semantic Layer & Data Preview Modal */}
      <AnimatePresence>
        {activeDatasetId && (
          <SemanticLayerModal
            datasetId={activeDatasetId}
            onClose={() => setActiveDatasetId(null)}
            onUpdated={loadDatasets}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

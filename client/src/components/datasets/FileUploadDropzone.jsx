import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export function FileUploadDropzone({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file) => {
    setError('');
    setSuccessMessage('');

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setError('Please select a valid CSV or Excel (.xlsx) file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25 MB limit.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error?.message || `Upload failed with status ${response.status}`);
      }

      setSuccessMessage(`Dataset "${file.name}" ingested successfully into your sandbox!`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onUploadSuccess) {
        onUploadSuccess(data.dataset);
      }
    } catch (err) {
      setError(err.message || 'Failed to ingest file. Please check file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv, .xlsx, .xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-slate-700'
        } ${uploading ? 'opacity-80 pointer-events-none' : ''}`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all ${
              uploading
                ? 'bg-indigo-500/10 text-indigo-500'
                : 'bg-gradient-to-tr from-emerald-500/10 via-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {uploading
                ? 'Ingesting into PostgreSQL Sandbox...'
                : 'Drag & Drop CSV or Excel Files Here'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {uploading
                ? 'Parsing headers, inferring types, and creating sandbox schema table...'
                : 'or click to browse from your computer. Supports .csv and .xlsx up to 25 MB.'}
            </p>
          </div>

          {!uploading && (
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                CSV / XLSX
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                Auto Type Inference
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-4 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-4 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
          <div className="leading-relaxed">{successMessage}</div>
        </div>
      )}
    </div>
  );
}

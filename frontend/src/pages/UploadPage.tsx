import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { extractApiError } from '../services/api';
import * as chapterService from '../services/chapterService';
import { formatBytes, validateChapterJsonFile } from '../utils/jsonValidator';

interface QueuedFile {
  id: string;
  file: File;
  validationStatus: 'valid' | 'invalid';
  validationMessage: string;
  chapterTitle?: string;
  questionCount?: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'duplicate' | 'error';
  uploadMessage?: string;
  uploadedChapterId?: string;
}

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  const addFiles = async (fileList: FileList | File[]) => {
    setGlobalError('');
    setGlobalSuccess('');
    const files = Array.from(fileList);

    const validated: QueuedFile[] = await Promise.all(
      files.map(async (file) => {
        const res = await validateChapterJsonFile(file);
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          validationStatus: res.valid ? 'valid' : 'invalid',
          validationMessage: res.valid
            ? `${res.chapterTitle} (${res.questionCount} questions)`
            : res.error || 'Invalid JSON file',
          chapterTitle: res.chapterTitle,
          questionCount: res.questionCount,
          uploadStatus: 'pending',
        };
      })
    );

    setQueue((prev) => [...prev, ...validated]);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadBatch = async (targetItems: QueuedFile[]) => {
    if (targetItems.length === 0) return;

    setUploading(true);
    setProgress(0);
    setGlobalError('');
    setGlobalSuccess('');

    const targetIds = new Set(targetItems.map((t) => t.id));
    setQueue((prev) =>
      prev.map((item) =>
        targetIds.has(item.id)
          ? { ...item, uploadStatus: 'uploading', uploadMessage: undefined }
          : item
      )
    );

    try {
      const results = await chapterService.uploadChapterFiles(
        targetItems.map((t) => t.file),
        (pct) => setProgress(pct)
      );

      setQueue((prev) =>
        prev.map((item) => {
          if (!targetIds.has(item.id)) return item;
          const match = results.find((r) => r.fileName === item.file.name);
          if (!match) {
            return {
              ...item,
              uploadStatus: 'error',
              uploadMessage: 'No response returned for this file.',
            };
          }
          return {
            ...item,
            uploadStatus: match.status,
            uploadMessage: match.message,
            uploadedChapterId: match.chapterId,
          };
        })
      );

      const okCount = results.filter((r) => r.status === 'success').length;
      if (okCount > 0) {
        // Re-fetch chapters from backend API to confirm persistence
        await chapterService.getChapters({ page: 1, limit: 5 });
        setGlobalSuccess(
          `${okCount} chapter${okCount === 1 ? '' : 's'} saved to Neon PostgreSQL.`
        );
      } else {
        setGlobalError('No chapters were uploaded. Review individual file statuses below.');
      }
    } catch (err) {
      const msg = extractApiError(err, 'Upload failed.');
      setGlobalError(msg);
      setQueue((prev) =>
        prev.map((item) =>
          targetIds.has(item.id)
            ? { ...item, uploadStatus: 'error', uploadMessage: msg }
            : item
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAll = async () => {
    const validPending = queue.filter(
      (item) =>
        item.validationStatus === 'valid' &&
        (item.uploadStatus === 'pending' || item.uploadStatus === 'error')
    );
    await uploadBatch(validPending);
  };

  const handleRetryFile = async (item: QueuedFile) => {
    await uploadBatch([item]);
  };

  const validUploadableCount = queue.filter(
    (q) =>
      q.validationStatus === 'valid' &&
      (q.uploadStatus === 'pending' || q.uploadStatus === 'error')
  ).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Upload Chapter JSON
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload one or multiple educational JSON files. Chapters are validated and permanently saved in Neon PostgreSQL.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-teal-500 bg-teal-50/50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              addFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <div className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mx-auto">
          <Upload className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-900">
          Drag and drop JSON chapter files here, or{' '}
          <span className="text-teal-600">browse files</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Supports multiple .json files up to 10MB each (e.g., 01_percentage.json, 02_profit_loss.json)
        </p>
      </div>

      {globalError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {globalSuccess && (
        <div className="flex items-center justify-between gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{globalSuccess}</span>
          </div>
          <Link
            to="/chapters"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
          >
            View Chapters <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {uploading && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
            <span>Uploading & saving chapters to Neon PostgreSQL...</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Selected Files Queue */}
      {queue.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              Selected Files ({queue.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => setQueue([])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Clear All
              </button>
              <button
                type="button"
                disabled={uploading || validUploadableCount === 0}
                onClick={handleUploadAll}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40"
              >
                {uploading
                  ? 'Uploading...'
                  : `Upload ${validUploadableCount} Valid File${validUploadableCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {queue.map((item) => (
              <div
                key={item.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <FileJson className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {item.file.name}
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>

                    {item.uploadMessage ? (
                      <p
                        className={`text-xs mt-0.5 ${
                          item.uploadStatus === 'success'
                            ? 'text-emerald-600'
                            : item.uploadStatus === 'duplicate'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {item.uploadMessage}
                      </p>
                    ) : (
                      <p
                        className={`text-xs mt-0.5 ${
                          item.validationStatus === 'valid'
                            ? 'text-slate-500'
                            : 'text-rose-600'
                        }`}
                      >
                        {item.validationMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.uploadStatus === 'success' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  )}

                  {item.uploadStatus === 'duplicate' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Duplicate
                    </span>
                  )}

                  {item.uploadStatus === 'error' && item.validationStatus === 'valid' && (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => handleRetryFile(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  )}

                  {item.validationStatus === 'invalid' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Invalid JSON
                    </span>
                  )}

                  {item.uploadedChapterId && (
                    <Link
                      to={`/chapters/${item.uploadedChapterId}`}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100"
                    >
                      Open
                    </Link>
                  )}

                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => removeFile(item.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

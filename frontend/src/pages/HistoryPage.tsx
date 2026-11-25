import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import { extractApiError } from '../services/api';
import { getPracticeHistoryWithInProgress } from '../services/practiceService';
import { getUploadHistory } from '../services/uploadService';
import { formatBytes } from '../utils/jsonValidator';
import { InProgressAttempt, PracticeAttempt, UploadHistoryItem } from '../types';

export function HistoryPage() {
  const [tab, setTab] = useState<'practice' | 'uploads'>('practice');
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [inProgress, setInProgress] = useState<InProgressAttempt[]>([]);
  const [uploads, setUploads] = useState<UploadHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [practiceData, uploadData] = await Promise.all([
          getPracticeHistoryWithInProgress(),
          getUploadHistory(),
        ]);
        if (active) {
          setAttempts(practiceData.attempts);
          setInProgress(practiceData.inProgress || []);
          setUploads(uploadData);
        }
      } catch (err) {
        if (active) setError(extractApiError(err, 'Failed to load history.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">History</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Audit log of your paused &amp; completed practice sessions and JSON chapter uploads.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('practice')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'practice'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Practice Attempts ({attempts.length + inProgress.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('uploads')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'uploads'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload History ({uploads.length})
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : tab === 'practice' ? (
        <div className="space-y-4">
          {inProgress.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200 flex items-center gap-2 text-xs font-semibold text-amber-800">
                <Clock className="h-4 w-4" />
                Paused / In-Progress Tests ({inProgress.length})
              </div>
              <div className="divide-y divide-slate-100">
                {inProgress.map((p) => (
                  <div
                    key={p.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {p.chapter?.title || 'Chapter Practice'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {p._count.userAnswers} / {p.totalQuestions} answered · Last at Question{' '}
                        {p.lastQuestionIndex + 1} · Saved{' '}
                        {new Date(p.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <Link
                      to={`/practice/${p.chapterId}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 shrink-0"
                    >
                      Resume
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            {attempts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No completed practice attempts recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Chapter</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Correct</th>
                      <th className="px-5 py-3">Completed</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {a.chapter.title}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{a.chapter.category}</td>
                        <td className="px-5 py-3.5 font-semibold text-teal-600 tabular-nums">
                          {a.scorePercentage}%
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 tabular-nums">
                          {a.correctAnswers} / {a.totalQuestions}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {new Date(a.completedAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/practice/${a.chapterId}`}
                            className="text-xs font-medium text-teal-600 hover:underline"
                          >
                            Retry
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          {uploads.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No upload history recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">File Name</th>
                    <th className="px-5 py-3">Size</th>
                    <th className="px-5 py-3">Questions</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Uploaded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uploads.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-900">{u.fileName}</div>
                        {u.errorMessage && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {u.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 tabular-nums">
                        {formatBytes(u.fileSize)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 tabular-nums">
                        {u.questionsCount}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Success
                          </span>
                        )}
                        {u.status === 'duplicate' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Duplicate
                          </span>
                        )}
                        {u.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700">
                            <XCircle className="h-3.5 w-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

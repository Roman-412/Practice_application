import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  HelpCircle,
  CheckCircle2,
  FolderUp,
  Upload,
  ArrowRight,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { getDashboardStats } from '../services/dashboardService';
import { extractApiError } from '../services/api';
import { DashboardStats } from '../types';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getDashboardStats();
        if (active) setStats(data);
      } catch (err) {
        if (active) setError(extractApiError(err, 'Failed to load dashboard statistics.'));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of your uploaded chapters, questions, and learning activity.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors shrink-0"
        >
          <Upload className="h-4 w-4" />
          Quick Upload Chapter
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Chapters"
              value={stats?.totalChapters ?? 0}
              icon={BookOpen}
              helper="Stored in Neon PostgreSQL"
              tone="teal"
            />
            <StatCard
              label="Total Questions"
              value={stats?.totalQuestions ?? 0}
              icon={HelpCircle}
              helper="Across all chapters"
              tone="sky"
            />
            <StatCard
              label="Uploaded Chapters"
              value={stats?.uploadedChapters ?? 0}
              icon={FolderUp}
              helper="JSON files imported"
              tone="amber"
            />
            <StatCard
              label="Active Chapters"
              value={stats?.activeChapters ?? 0}
              icon={CheckCircle2}
              helper="Ready for study & practice"
              tone="emerald"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recently Uploaded Chapters */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Recently Uploaded Chapters
                </h2>
                <Link
                  to="/chapters"
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {!stats?.recentChapters.length ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500">No chapters uploaded yet.</p>
                  <Link
                    to="/upload"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload your first JSON chapter
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.recentChapters.map((ch) => (
                    <div
                      key={ch.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/chapters/${ch.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-teal-600 truncate"
                          >
                            {ch.title}
                          </Link>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                            {ch.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ch.questionCount} questions · Uploaded{' '}
                          {new Date(ch.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/chapters/${ch.id}`}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-100"
                        >
                          Open
                        </Link>
                        <Link
                          to={`/practice/${ch.id}`}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100"
                        >
                          Practice
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Latest Activity */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Latest Activity</h2>
                <Link
                  to="/history"
                  className="text-xs font-medium text-teal-600 hover:text-teal-700"
                >
                  History
                </Link>
              </div>

              {!stats?.latestActivity.length ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No recent activity yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.latestActivity.map((act) => (
                    <div key={act.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="mt-0.5 h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        {act.type === 'upload' ? (
                          <Upload className="h-3.5 w-3.5" />
                        ) : (
                          <GraduationCap className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {act.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{act.subtitle}</p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

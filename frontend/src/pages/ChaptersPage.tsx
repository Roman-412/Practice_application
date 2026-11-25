import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Edit2,
  Trash2,
  GraduationCap,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { EditChapterModal } from '../components/EditChapterModal';
import { extractApiError } from '../services/api';
import * as chapterService from '../services/chapterService';
import { ChapterSummary } from '../types';

export function ChaptersPage() {
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingChapter, setEditingChapter] = useState<ChapterSummary | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingChapter, setDeletingChapter] = useState<ChapterSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchChapters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await chapterService.getChapters({
        search: search || undefined,
        category,
        sort,
        page,
        limit: 9,
      });
      setChapters(data.chapters);
      setCategories(data.categories);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(extractApiError(err, 'Failed to fetch chapters.'));
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChapters();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchChapters]);

  const handleSaveEdit = async (
    id: string,
    payload: {
      title: string;
      description: string;
      category: string;
      instructions: string | null;
      isActive: boolean;
    }
  ) => {
    setSavingEdit(true);
    try {
      await chapterService.updateChapter(id, payload);
      setEditingChapter(null);
      await fetchChapters();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update chapter.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingChapter) return;
    setDeleting(true);
    try {
      await chapterService.deleteChapter(deletingChapter.id);
      setDeletingChapter(null);
      await fetchChapters();
    } catch (err) {
      setError(extractApiError(err, 'Failed to delete chapter.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Chapters
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} chapter{total === 1 ? '' : 's'} persisted in Neon PostgreSQL
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors shrink-0"
        >
          <Upload className="h-4 w-4" />
          Upload JSON
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search chapters by name, code, or description..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as 'newest' | 'oldest' | 'title');
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No chapters found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {search || category !== 'all'
              ? 'Try adjusting your search or category filter.'
              : 'Upload a JSON chapter file to get started.'}
          </p>
          {!search && category === 'all' && (
            <Link
              to="/upload"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
            >
              <Upload className="h-4 w-4" />
              Upload Chapter JSON
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-700">
                      {ch.category}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        ch.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ch.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <Link
                    to={`/chapters/${ch.id}`}
                    className="mt-3 block text-base font-semibold text-slate-900 hover:text-teal-600 line-clamp-1"
                  >
                    {ch.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                    {ch.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="font-medium text-slate-700 tabular-nums">
                      {ch.questionCount} questions
                    </span>
                    <span>{new Date(ch.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/chapters/${ch.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
                    >
                      Open
                    </Link>
                    <Link
                      to={`/practice/${ch.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100"
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      Practice
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingChapter(ch)}
                      title="Edit chapter"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingChapter(ch)}
                      title="Delete chapter"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <EditChapterModal
        chapter={editingChapter}
        loading={savingEdit}
        onSave={handleSaveEdit}
        onClose={() => setEditingChapter(null)}
      />

      <ConfirmModal
        open={Boolean(deletingChapter)}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${deletingChapter?.title}"? All questions and practice attempts associated with this chapter will be permanently removed from Neon PostgreSQL.`}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingChapter(null)}
      />
    </div>
  );
}

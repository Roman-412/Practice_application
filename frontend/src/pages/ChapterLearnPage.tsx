import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Info,
  Lightbulb,
} from 'lucide-react';
import { extractApiError } from '../services/api';
import { getChapterById } from '../services/chapterService';
import { ChapterDetail } from '../types';

interface SubTopic {
  id: string;
  name: string;
  short?: string;
  story?: string[];
  rule?: string[];
  tricks?: string[];
  exam?: string[];
}

interface PuzzleItem {
  t: string;
  lv?: string;
  min?: number;
  p?: string[];
  sol?: string[];
  grid?: string[][];
}

export function ChapterLearnPage() {
  const { id } = useParams<{ id: string }>();
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllMode, setShowAllMode] = useState(false);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [activePuzzleIdx, setActivePuzzleIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await getChapterById(id);
        if (active) {
          setChapter(data);
          setCurrentIndex(0);
        }
      } catch (err) {
        if (active) setError(extractApiError(err, 'Failed to load chapter.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const parsedSubTopics = useMemo<SubTopic[] | null>(() => {
    if (!chapter?.instructions) return null;
    try {
      const parsed = JSON.parse(chapter.instructions);
      if (parsed && Array.isArray(parsed.subs)) {
        return parsed.subs as SubTopic[];
      }
    } catch {
      return null;
    }
    return null;
  }, [chapter?.instructions]);

  const parsedPuzzles = useMemo<PuzzleItem[] | null>(() => {
    if (!chapter?.instructions) return null;
    try {
      const parsed = JSON.parse(chapter.instructions);
      if (parsed && Array.isArray(parsed.puzzles)) {
        return parsed.puzzles as PuzzleItem[];
      }
    } catch {
      return null;
    }
    return null;
  }, [chapter?.instructions]);

  useEffect(() => {
    if (parsedSubTopics && parsedSubTopics.length > 0) {
      setActiveSubId(parsedSubTopics[0].id);
    } else {
      setActiveSubId(null);
    }
  }, [parsedSubTopics]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-sm text-rose-600">{error || 'Chapter not found.'}</p>
        <Link
          to="/chapters"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chapters
        </Link>
      </div>
    );
  }

  const questions = chapter.questions;
  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const progressPercent = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const activeSubTopic = parsedSubTopics?.find((s) => s.id === activeSubId) || null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/chapters"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Chapters
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllMode((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {showAllMode ? 'Step-by-Step View' : `View All (${total})`}
          </button>

          <Link
            to={`/practice/${chapter.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Practice Mode
          </Link>
        </div>
      </div>

      {/* Chapter Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700">
            {chapter.category}
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500 tabular-nums">{total} Questions</span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          {chapter.title}
        </h1>
        {chapter.description && (
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {chapter.description}
          </p>
        )}

        {chapter.instructions && !parsedSubTopics && !parsedPuzzles && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
            <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Instructions: </span>
              {chapter.instructions}
            </div>
          </div>
        )}

        {!showAllMode && total > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Chapter Progress</span>
              <span className="font-medium text-slate-700 tabular-nums">
                Question {currentIndex + 1} of {total} ({progressPercent}%)
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Puzzle Passages & Solution Grids (for mock puzzle JSONs) */}
      {parsedPuzzles && parsedPuzzles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Puzzles &amp; Solution Grids ({parsedPuzzles.length})
              </h2>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {parsedPuzzles.map((puz, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePuzzleIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activePuzzleIdx === idx
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Puzzle {idx + 1}
              </button>
            ))}
          </div>

          {parsedPuzzles[activePuzzleIdx] && (() => {
            const puz = parsedPuzzles[activePuzzleIdx];
            return (
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900">{puz.t}</h3>
                  <div className="flex items-center gap-2">
                    {puz.lv && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700">
                        {puz.lv}
                      </span>
                    )}
                    {puz.min && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700">
                        {puz.min} min
                      </span>
                    )}
                  </div>
                </div>

                {puz.p && puz.p.length > 0 && (
                  <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    {puz.p.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}

                {puz.grid && puz.grid.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold">
                        <tr>
                          {puz.grid[0].map((cell, cIdx) => (
                            <th key={cIdx} className="px-3 py-2 border-b border-slate-200">
                              {cell}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {puz.grid.slice(1).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 text-slate-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {puz.sol && puz.sol.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">
                      Solution Steps
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-700 leading-relaxed">
                      {puz.sol.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Sub-topics Study Notes (for JSON files containing `subs`) */}
      {parsedSubTopics && parsedSubTopics.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Concept Notes &amp; Sub-Topics ({parsedSubTopics.length})
            </h2>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {parsedSubTopics.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveSubId(sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSubId === sub.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sub.short || sub.name}
              </button>
            ))}
          </div>

          {activeSubTopic && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {activeSubTopic.name}
              </h3>

              {activeSubTopic.story && activeSubTopic.story.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 mb-1">
                    Story / Intuition
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                    {activeSubTopic.story.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {activeSubTopic.rule && activeSubTopic.rule.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">
                    Rules
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                    {activeSubTopic.rule.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSubTopic.tricks && activeSubTopic.tricks.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
                    Tricks &amp; Shortcuts
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                    {activeSubTopic.tricks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSubTopic.exam && activeSubTopic.exam.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 mb-1">
                    Exam Tips &amp; Traps
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                    {activeSubTopic.exam.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      {total === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          This chapter does not contain any questions.
        </div>
      ) : showAllMode ? (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-teal-600 tabular-nums">
                  Question {idx + 1} of {total}
                </span>
                <div className="flex items-center gap-2">
                  {q.difficulty && (
                    <span className="uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                      {q.difficulty}
                    </span>
                  )}
                  <span className="uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {q.questionType}
                  </span>
                </div>
              </div>

              <h2 className="text-base font-medium text-slate-900 leading-relaxed whitespace-pre-line">
                {q.questionText}
              </h2>

              <div className="mt-4 space-y-2">
                {q.options.length === 0 ? (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50/70 text-emerald-900 text-sm font-medium">
                    <span>Answer: {q.correctAnswer}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                ) : (
                  q.options.map((opt, optIdx) => (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm ${
                        opt.isCorrect
                          ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-medium'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-400 w-4">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span>{opt.optionText}</span>
                      </div>
                      {opt.isCorrect && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Correct
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {q.explanation && (
                <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200/80 px-4 py-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  <span className="font-semibold text-slate-900">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        currentQuestion && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span className="font-semibold text-teal-600 tabular-nums">
                Question {currentIndex + 1} of {total}
              </span>
              <div className="flex items-center gap-2">
                {currentQuestion.difficulty && (
                  <span className="uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                    {currentQuestion.difficulty}
                  </span>
                )}
                <span className="uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {currentQuestion.questionType}
                </span>
              </div>
            </div>

            <h2 className="text-base font-medium text-slate-900 leading-relaxed whitespace-pre-line">
              {currentQuestion.questionText}
            </h2>

            <div className="mt-5 space-y-2.5">
              {currentQuestion.options.length === 0 ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-emerald-300 bg-emerald-50/70 text-emerald-900 text-sm font-medium">
                  <span>Answer: {currentQuestion.correctAnswer}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                </div>
              ) : (
                currentQuestion.options.map((opt, optIdx) => (
                  <div
                    key={opt.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${
                      opt.isCorrect
                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-medium'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-400 w-4">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      <span>{opt.optionText}</span>
                    </div>
                    {opt.isCorrect && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Correct Answer
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {currentQuestion.explanation && (
              <div className="mt-5 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                <span className="font-semibold text-slate-900">Explanation: </span>
                {currentQuestion.explanation}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-xs px-2">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-7 min-w-[1.75rem] px-1.5 rounded-md text-xs font-medium tabular-nums ${
                      idx === currentIndex
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={currentIndex >= total - 1}
                onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

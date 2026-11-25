import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  PauseCircle,
} from 'lucide-react';
import { API_BASE_URL, extractApiError } from '../services/api';
import { getChapterById, getChapters } from '../services/chapterService';
import {
  getPracticeHistoryWithInProgress,
  getPracticeProgress,
  resetPracticeProgress,
  savePracticeProgress,
  submitPractice,
} from '../services/practiceService';
import {
  ChapterDetail,
  ChapterSummary,
  InProgressAttempt,
  PracticeSubmissionResult,
} from '../types';

export function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [chaptersList, setChaptersList] = useState<ChapterSummary[]>([]);
  const [inProgressMap, setInProgressMap] = useState<Record<string, InProgressAttempt>>({});
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [resumedBanner, setResumedBanner] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<PracticeSubmissionResult | null>(null);

  const latestProgressRef = useRef<{
    chapterId: string | null;
    currentIndex: number;
    answers: Record<string, string>;
    completed: boolean;
  }>({
    chapterId: null,
    currentIndex: 0,
    answers: {},
    completed: false,
  });

  useEffect(() => {
    latestProgressRef.current = {
      chapterId: chapter?.id ?? null,
      currentIndex,
      answers,
      completed: Boolean(finalResult),
    };
  }, [chapter?.id, currentIndex, answers, finalResult]);

  // Automatically flush progress to Neon PostgreSQL when leaving the page, closing tab, or navigating away
  useEffect(() => {
    const flushProgress = () => {
      const state = latestProgressRef.current;
      if (!state.chapterId || state.completed) return;
      const answerList = Object.entries(state.answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));
      if (answerList.length === 0 && state.currentIndex === 0) return;

      void fetch(`${API_BASE_URL}/practice/progress`, {
        method: 'PUT',
        credentials: 'include',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: state.chapterId,
          currentIndex: state.currentIndex,
          answers: answerList,
        }),
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushProgress();
      }
    };

    window.addEventListener('pagehide', flushProgress);
    window.addEventListener('beforeunload', flushProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushProgress);
      window.removeEventListener('beforeunload', flushProgress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushProgress();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setFinalResult(null);
    setAnswers({});
    setCheckedQuestions({});
    setCurrentIndex(0);
    setResumedBanner(false);
    setSyncState('idle');

    (async () => {
      try {
        if (!id) {
          const [chaptersData, historyData] = await Promise.all([
            getChapters({ limit: 50 }),
            getPracticeHistoryWithInProgress(),
          ]);
          if (active) {
            setChaptersList(chaptersData.chapters);
            const map: Record<string, InProgressAttempt> = {};
            for (const item of historyData.inProgress || []) {
              map[item.chapterId] = item;
            }
            setInProgressMap(map);
            setChapter(null);
          }
        } else {
          const [chapterData, progressData] = await Promise.all([
            getChapterById(id),
            getPracticeProgress(id),
          ]);
          if (active) {
            setChapter(chapterData);
            if (
              progressData &&
              (progressData.userAnswers.length > 0 || progressData.lastQuestionIndex > 0)
            ) {
              const restoredAnswers: Record<string, string> = {};
              const restoredChecked: Record<string, boolean> = {};
              for (const ua of progressData.userAnswers) {
                restoredAnswers[ua.questionId] = ua.selectedOption;
                restoredChecked[ua.questionId] = true;
              }
              setAnswers(restoredAnswers);
              setCheckedQuestions(restoredChecked);
              const safeIndex = Math.min(
                Math.max(0, progressData.lastQuestionIndex),
                Math.max(0, chapterData.questions.length - 1)
              );
              setCurrentIndex(safeIndex);
              setResumedBanner(true);
              setSyncState('saved');
            }
          }
        }
      } catch (err) {
        if (active) setError(extractApiError(err, 'Failed to load practice session.'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const persistProgress = async (
    nextIndex: number,
    questionId?: string,
    selectedOption?: string
  ) => {
    if (!chapter) return;
    setSyncState('saving');
    try {
      await savePracticeProgress({
        chapterId: chapter.id,
        currentIndex: nextIndex,
        questionId,
        selectedOption,
      });
      setSyncState('saved');
    } catch {
      setSyncState('idle');
    }
  };

  const handleSelectOption = (questionId: string, optionText: string) => {
    if (checkedQuestions[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionText }));
    setCheckedQuestions((prev) => ({ ...prev, [questionId]: true }));
    void persistProgress(currentIndex, questionId, optionText);
  };

  const handleNavigateIndex = (nextIndex: number) => {
    setCurrentIndex(nextIndex);
    void persistProgress(nextIndex);
  };

  const handlePauseAndExit = async () => {
    if (chapter) {
      const answerList = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));
      try {
        setSyncState('saving');
        await savePracticeProgress({
          chapterId: chapter.id,
          currentIndex,
          answers: answerList,
        });
      } catch {
        // best-effort save
      }
    }
    navigate('/practice');
  };

  const handleStartFresh = async () => {
    if (!chapter) return;
    try {
      await resetPracticeProgress(chapter.id);
    } catch {
      // ignore if none
    }
    setAnswers({});
    setCheckedQuestions({});
    setCurrentIndex(0);
    setResumedBanner(false);
    setSyncState('idle');
  };

  const handleFinishPractice = async () => {
    if (!chapter) return;
    setSubmitting(true);
    setError('');
    try {
      const payloadAnswers = chapter.questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({
          questionId: q.id,
          selectedOption: answers[q.id],
        }));

      const result = await submitPractice({
        chapterId: chapter.id,
        answers: payloadAnswers,
      });
      setFinalResult(result);
      setResumedBanner(false);
    } catch (err) {
      setError(extractApiError(err, 'Failed to submit practice attempt.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCheckedQuestions({});
    setCurrentIndex(0);
    setFinalResult(null);
    setResumedBanner(false);
    setSyncState('idle');
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Chapter selector view when visiting /practice without :id
  if (!id) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Practice Mode
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a chapter to start or resume your saved practice session.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {chaptersList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="mt-3 text-sm text-slate-600">
              No chapters available yet. Upload a JSON chapter first.
            </p>
            <Link
              to="/upload"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
            >
              Upload JSON
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chaptersList.map((ch) => {
              const saved = inProgressMap[ch.id];
              return (
                <div
                  key={ch.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                        {ch.category}
                      </span>
                      {saved && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                          <Clock className="h-3 w-3" />
                          {saved._count.userAnswers}/{ch.questionCount} saved
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-sm font-semibold text-slate-900 truncate">
                      {ch.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {ch.questionCount} questions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/practice/${ch.id}`)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white shrink-0 ${
                      saved
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    {saved ? 'Resume' : 'Start'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-sm text-rose-600">{error || 'Chapter not found.'}</p>
      </div>
    );
  }

  // Final Score Summary Screen
  if (finalResult) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mx-auto">
            <Award className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Practice Completed!
          </h1>
          <p className="mt-1 text-sm text-slate-500">{finalResult.chapter.title}</p>

          <div className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Score</div>
              <div className="mt-1 text-xl font-semibold text-teal-600 tabular-nums">
                {finalResult.attempt.scorePercentage}%
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Correct</div>
              <div className="mt-1 text-xl font-semibold text-emerald-600 tabular-nums">
                {finalResult.attempt.correctAnswers}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Total</div>
              <div className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
                {finalResult.attempt.totalQuestions}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
            >
              <RotateCcw className="h-4 w-4" />
              Retry Chapter
            </button>
            <Link
              to={`/chapters/${chapter.id}`}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Review Chapter
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Answer Breakdown</h2>
          {finalResult.results.map((r, idx) => (
            <div
              key={r.questionId}
              className="bg-white border border-slate-200 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-900 whitespace-pre-line">
                  {idx + 1}. {r.questionText}
                </p>
                {r.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                )}
              </div>
              <div className="mt-2 text-xs space-y-1">
                <p className={r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                  Your answer: <span className="font-medium">{r.selectedOption}</span>
                </p>
                {!r.isCorrect && (
                  <p className="text-emerald-700">
                    Correct answer: <span className="font-medium">{r.correctAnswer}</span>
                  </p>
                )}
                {r.explanation && (
                  <p className="text-slate-600 pt-1 whitespace-pre-line">{r.explanation}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const questions = chapter.questions;
  const total = questions.length;
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(checkedQuestions).length;
  const isCurrentChecked = currentQ ? Boolean(checkedQuestions[currentQ.id]) : false;
  const selectedForCurrent = currentQ ? answers[currentQ.id] : undefined;
  const isCurrentCorrect =
    currentQ && selectedForCurrent
      ? selectedForCurrent.trim().toLowerCase() ===
        currentQ.correctAnswer.trim().toLowerCase()
      : false;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-teal-600">{chapter.category}</span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {chapter.title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
              {syncState === 'saving' && <span>Saving...</span>}
              {syncState === 'saved' && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Progress saved
                </span>
              )}
              {syncState === 'idle' && <span>Answered</span>}
            </div>
            <div className="text-sm font-semibold text-slate-900 tabular-nums">
              {answeredCount} / {total}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePauseAndExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
          >
            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
            Pause &amp; Exit
          </button>
        </div>
      </div>

      {resumedBanner && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <span>
            Resumed from Question {currentIndex + 1} ({answeredCount} of {total} answered).
          </span>
          <button
            type="button"
            onClick={handleStartFresh}
            className="font-semibold text-amber-900 hover:underline shrink-0"
          >
            Start Fresh
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-600 transition-all duration-200"
          style={{ width: `${total > 0 ? Math.round((answeredCount / total) * 100) : 0}%` }}
        />
      </div>

      {currentQ && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 tabular-nums mb-3">
            <span>
              Question {currentIndex + 1} of {total}
            </span>
            {currentQ.difficulty && (
              <span className="uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                {currentQ.difficulty}
              </span>
            )}
          </div>

          <h2 className="text-base font-medium text-slate-900 leading-relaxed whitespace-pre-line">
            {currentQ.questionText}
          </h2>

          <div className="mt-5 space-y-2.5">
            {currentQ.options.length === 0 ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isCurrentChecked}
                  value={selectedForCurrent || ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                  }
                  placeholder="Type your answer..."
                  className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50"
                />
                {!isCurrentChecked && (
                  <button
                    type="button"
                    disabled={!selectedForCurrent?.trim()}
                    onClick={() =>
                      handleSelectOption(currentQ.id, selectedForCurrent!.trim())
                    }
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
                  >
                    Check Answer
                  </button>
                )}
              </div>
            ) : (
              currentQ.options.map((opt, idx) => {
                const isSelected = selectedForCurrent === opt.optionText;
                let optionStyle =
                  'border-slate-200 bg-white text-slate-800 hover:border-teal-300 hover:bg-slate-50';

                if (isCurrentChecked) {
                  if (opt.isCorrect) {
                    optionStyle =
                      'border-emerald-400 bg-emerald-50 text-emerald-900 font-medium';
                  } else if (isSelected && !opt.isCorrect) {
                    optionStyle = 'border-rose-400 bg-rose-50 text-rose-900';
                  } else {
                    optionStyle = 'border-slate-200 bg-slate-50/50 text-slate-500';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isCurrentChecked}
                    onClick={() => handleSelectOption(currentQ.id, opt.optionText)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm text-left transition-colors ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-400 w-4">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span>{opt.optionText}</span>
                    </div>
                    {isCurrentChecked && opt.isCorrect && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    {isCurrentChecked && isSelected && !opt.isCorrect && (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {isCurrentChecked && (
            <div
              className={`mt-5 rounded-lg border p-4 text-sm ${
                isCurrentCorrect
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                  : 'border-rose-200 bg-rose-50/70 text-rose-900'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                {isCurrentCorrect ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Incorrect — Correct answer: {currentQ.correctAnswer}
                  </>
                )}
              </div>
              {currentQ.explanation && (
                <p className="mt-1.5 text-xs leading-relaxed opacity-90 whitespace-pre-line">
                  {currentQ.explanation}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => handleNavigateIndex(Math.max(0, currentIndex - 1))}
              className="px-3.5 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {answeredCount > 0 && currentIndex < total - 1 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinishPractice}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Finish Early
                </button>
              )}

              {currentIndex < total - 1 ? (
                <button
                  type="button"
                  onClick={() => handleNavigateIndex(currentIndex + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
                >
                  Next Question
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || answeredCount === 0}
                  onClick={handleFinishPractice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {submitting ? 'Submitting...' : 'Submit & View Score'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

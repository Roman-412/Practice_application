import { api } from './api';
import {
  InProgressAttempt,
  PracticeAttempt,
  PracticeProgressAttempt,
  PracticeSubmissionResult,
} from '../types';

export async function getPracticeProgress(
  chapterId: string
): Promise<PracticeProgressAttempt | null> {
  const res = await api.get<{ data: { attempt: PracticeProgressAttempt | null } }>(
    `/practice/progress/${chapterId}`
  );
  return res.data.data.attempt;
}

export async function savePracticeProgress(payload: {
  chapterId: string;
  currentIndex: number;
  questionId?: string;
  selectedOption?: string;
}): Promise<PracticeProgressAttempt> {
  const res = await api.put<{ data: { attempt: PracticeProgressAttempt } }>(
    '/practice/progress',
    payload
  );
  return res.data.data.attempt;
}

export async function resetPracticeProgress(chapterId: string): Promise<void> {
  await api.delete(`/practice/progress/${chapterId}`);
}

export async function submitPractice(payload: {
  chapterId: string;
  answers: Array<{
    questionId: string;
    selectedOption: string;
  }>;
}): Promise<PracticeSubmissionResult> {
  const res = await api.post<{ data: PracticeSubmissionResult }>(
    '/practice/submit',
    payload
  );
  return res.data.data;
}

export async function getPracticeHistory(): Promise<PracticeAttempt[]> {
  const res = await api.get<{
    data: { attempts: PracticeAttempt[]; inProgress?: InProgressAttempt[] };
  }>('/practice/history');
  return res.data.data.attempts;
}

export async function getPracticeHistoryWithInProgress(): Promise<{
  attempts: PracticeAttempt[];
  inProgress: InProgressAttempt[];
}> {
  const res = await api.get<{
    data: { attempts: PracticeAttempt[]; inProgress: InProgressAttempt[] };
  }>('/practice/history');
  return res.data.data;
}

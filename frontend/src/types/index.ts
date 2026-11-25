export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  chapterId: string;
  externalQuestionId: string;
  orderIndex: number;
  questionText: string;
  questionType: string;
  correctAnswer: string;
  explanation: string;
  difficulty?: string | null;
  options: QuestionOption[];
}

export interface ChapterSummary {
  id: string;
  chapterCode: string;
  title: string;
  description: string;
  category: string;
  instructions?: string | null;
  isActive: boolean;
  questionCount: number;
  sourceFileName?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    practiceAttempts: number;
  };
}

export interface ChapterDetail extends ChapterSummary {
  questions: Question[];
}

export interface DashboardStats {
  totalChapters: number;
  uploadedChapters: number;
  activeChapters: number;
  totalQuestions: number;
  recentChapters: Array<{
    id: string;
    chapterCode: string;
    title: string;
    category: string;
    questionCount: number;
    isActive: boolean;
    createdAt: string;
  }>;
  latestActivity: Array<{
    id: string;
    type: 'upload' | 'practice';
    title: string;
    subtitle: string;
    status: string;
    timestamp: string;
  }>;
}

export interface FileUploadResult {
  fileName: string;
  fileSize: number;
  status: 'success' | 'duplicate' | 'error';
  message: string;
  chapterId?: string;
  chapterTitle?: string;
  questionsCount?: number;
}

export interface UploadHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'success' | 'failed' | 'duplicate';
  errorMessage?: string | null;
  questionsCount: number;
  createdAt: string;
  chapter?: {
    id: string;
    title: string;
    chapterCode: string;
  } | null;
}

export interface PracticeAttempt {
  id: string;
  chapterId: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  completedAt: string;
  chapter: {
    id: string;
    title: string;
    category: string;
    chapterCode: string;
  };
}

export interface InProgressAttempt {
  id: string;
  chapterId: string;
  lastQuestionIndex: number;
  totalQuestions: number;
  correctAnswers: number;
  updatedAt: string;
  chapter?: {
    id: string;
    title: string;
    category: string;
    chapterCode: string;
  };
  _count: {
    userAnswers: number;
  };
}

export interface PracticeProgressAttempt {
  id: string;
  chapterId: string;
  status: string;
  lastQuestionIndex: number;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  userAnswers: Array<{
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
  }>;
}

export interface PracticeSubmissionResult {
  attempt: {
    id: string;
    totalQuestions: number;
    correctAnswers: number;
    scorePercentage: number;
    completedAt: string;
  };
  chapter: {
    id: string;
    title: string;
    category: string;
  };
  results: Array<{
    questionId: string;
    questionText: string;
    selectedOption: string;
    correctAnswer: string;
    explanation: string;
    isCorrect: boolean;
  }>;
}

export interface HealthStatus {
  success: boolean;
  status: string;
  database: string;
  environment: string;
  timestamp: string;
}

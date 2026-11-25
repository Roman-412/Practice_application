import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

export interface PracticeSubmissionInput {
  userId: string;
  chapterId: string;
  answers: Array<{
    questionId: string;
    selectedOption: string;
  }>;
}

export interface SavePracticeProgressInput {
  userId: string;
  chapterId: string;
  currentIndex: number;
  questionId?: string;
  selectedOption?: string;
  answers?: Array<{
    questionId: string;
    selectedOption: string;
  }>;
}

export async function getPracticeProgress(userId: string, chapterId: string) {
  const attempt = await prisma.practiceAttempt.findFirst({
    where: {
      userId,
      chapterId,
      status: 'in_progress',
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      userAnswers: {
        select: {
          questionId: true,
          selectedOption: true,
          isCorrect: true,
        },
      },
    },
  });

  return attempt;
}

export async function savePracticeProgress(input: SavePracticeProgressInput) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: input.chapterId,
      userId: input.userId,
    },
    select: {
      id: true,
      questionCount: true,
    },
  });

  if (!chapter) {
    throw new AppError('Chapter not found.', 404);
  }

  const pendingAnswers: Array<{ questionId: string; selectedOption: string }> = [
    ...(input.answers || []),
  ];
  if (input.questionId && input.selectedOption !== undefined) {
    pendingAnswers.push({
      questionId: input.questionId,
      selectedOption: input.selectedOption,
    });
  }

  const chapterQuestions =
    pendingAnswers.length > 0
      ? await prisma.question.findMany({
          where: {
            chapterId: chapter.id,
            id: { in: pendingAnswers.map((a) => a.questionId) },
          },
          select: { id: true, correctAnswer: true },
        })
      : [];

  const questionMap = new Map(chapterQuestions.map((q) => [q.id, q]));

  return prisma.$transaction(async (tx) => {
    let attempt = await tx.practiceAttempt.findFirst({
      where: {
        userId: input.userId,
        chapterId: chapter.id,
        status: 'in_progress',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!attempt) {
      attempt = await tx.practiceAttempt.create({
        data: {
          userId: input.userId,
          chapterId: chapter.id,
          status: 'in_progress',
          lastQuestionIndex: input.currentIndex,
          totalQuestions: chapter.questionCount,
          correctAnswers: 0,
          scorePercentage: 0,
          completedAt: null,
        },
      });
    }

    for (const item of pendingAnswers) {
      const q = questionMap.get(item.questionId);
      if (!q) continue;

      const isCorrect =
        q.correctAnswer.trim().toLowerCase() ===
        item.selectedOption.trim().toLowerCase();

      const existingAnswer = await tx.userAnswer.findFirst({
        where: {
          attemptId: attempt.id,
          questionId: q.id,
        },
      });

      if (existingAnswer) {
        await tx.userAnswer.update({
          where: { id: existingAnswer.id },
          data: {
            selectedOption: item.selectedOption,
            isCorrect,
          },
        });
      } else {
        await tx.userAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: q.id,
            selectedOption: item.selectedOption,
            isCorrect,
          },
        });
      }
    }

    const correctCount = await tx.userAnswer.count({
      where: {
        attemptId: attempt.id,
        isCorrect: true,
      },
    });

    const total = chapter.questionCount || 1;
    const scorePercentage = Math.round((correctCount / total) * 1000) / 10;

    return tx.practiceAttempt.update({
      where: { id: attempt.id },
      data: {
        lastQuestionIndex: input.currentIndex,
        totalQuestions: chapter.questionCount,
        correctAnswers: correctCount,
        scorePercentage,
      },
      include: {
        userAnswers: {
          select: {
            questionId: true,
            selectedOption: true,
            isCorrect: true,
          },
        },
      },
    });
  });
}

export async function resetPracticeProgress(userId: string, chapterId: string) {
  await prisma.practiceAttempt.deleteMany({
    where: {
      userId,
      chapterId,
      status: 'in_progress',
    },
  });
}

export async function submitPracticeAttempt(input: PracticeSubmissionInput) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: input.chapterId,
      userId: input.userId,
    },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!chapter) {
    throw new AppError('Chapter not found.', 404);
  }

  if (chapter.questions.length === 0) {
    throw new AppError('This chapter has no questions to practice.', 400);
  }

  const questionMap = new Map(chapter.questions.map((q) => [q.id, q]));

  const evaluatedAnswers = input.answers.map((ans) => {
    const question = questionMap.get(ans.questionId);
    if (!question) {
      throw new AppError(`Question ID "${ans.questionId}" does not belong to this chapter.`, 400);
    }

    const isCorrect =
      question.correctAnswer.trim().toLowerCase() === ans.selectedOption.trim().toLowerCase();

    return {
      questionId: question.id,
      questionText: question.questionText,
      selectedOption: ans.selectedOption,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      isCorrect,
    };
  });

  const correctAnswers = evaluatedAnswers.filter((a) => a.isCorrect).length;
  const totalQuestions = chapter.questions.length;
  const scorePercentage =
    totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 1000) / 10 : 0;

  const attempt = await prisma.$transaction(async (tx) => {
    const existingInProgress = await tx.practiceAttempt.findFirst({
      where: {
        userId: input.userId,
        chapterId: chapter.id,
        status: 'in_progress',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingInProgress) {
      await tx.userAnswer.deleteMany({
        where: { attemptId: existingInProgress.id },
      });

      const updatedAttempt = await tx.practiceAttempt.update({
        where: { id: existingInProgress.id },
        data: {
          status: 'completed',
          lastQuestionIndex: Math.max(0, totalQuestions - 1),
          totalQuestions,
          correctAnswers,
          scorePercentage,
          completedAt: new Date(),
        },
      });

      await tx.userAnswer.createMany({
        data: evaluatedAnswers.map((a) => ({
          attemptId: updatedAttempt.id,
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          isCorrect: a.isCorrect,
        })),
      });

      return updatedAttempt;
    }

    const createdAttempt = await tx.practiceAttempt.create({
      data: {
        userId: input.userId,
        chapterId: chapter.id,
        status: 'completed',
        lastQuestionIndex: Math.max(0, totalQuestions - 1),
        totalQuestions,
        correctAnswers,
        scorePercentage,
        completedAt: new Date(),
      },
    });

    await tx.userAnswer.createMany({
      data: evaluatedAnswers.map((a) => ({
        attemptId: createdAttempt.id,
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
      })),
    });

    return createdAttempt;
  });

  return {
    attempt,
    chapter: {
      id: chapter.id,
      title: chapter.title,
      category: chapter.category,
    },
    results: evaluatedAnswers,
  };
}

export async function getPracticeHistory(userId: string) {
  return prisma.practiceAttempt.findMany({
    where: { userId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
    take: 50,
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          category: true,
          chapterCode: true,
        },
      },
    },
  });
}

export async function getInProgressAttempts(userId: string) {
  return prisma.practiceAttempt.findMany({
    where: { userId, status: 'in_progress' },
    orderBy: { updatedAt: 'desc' },
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          category: true,
          chapterCode: true,
        },
      },
      _count: {
        select: { userAnswers: true },
      },
    },
  });
}

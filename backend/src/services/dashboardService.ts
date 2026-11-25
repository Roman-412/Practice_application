import { prisma } from '../config/prisma';

export async function getDashboardStats(userId: string) {
  const [
    totalChapters,
    activeChapters,
    questionAggregate,
    recentChapters,
    recentUploads,
    recentAttempts,
  ] = await Promise.all([
    prisma.chapter.count({ where: { userId } }),
    prisma.chapter.count({ where: { userId, isActive: true } }),
    prisma.chapter.aggregate({
      where: { userId },
      _sum: { questionCount: true },
    }),
    prisma.chapter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        chapterCode: true,
        title: true,
        category: true,
        questionCount: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.uploadHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fileName: true,
        status: true,
        questionsCount: true,
        createdAt: true,
      },
    }),
    prisma.practiceAttempt.findMany({
      where: { userId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        scorePercentage: true,
        correctAnswers: true,
        totalQuestions: true,
        completedAt: true,
        chapter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
  ]);

  const latestActivity = [
    ...recentUploads.map((u) => ({
      id: `upload-${u.id}`,
      type: 'upload' as const,
      title: u.fileName,
      subtitle:
        u.status === 'success'
          ? `Uploaded ${u.questionsCount} questions`
          : u.status === 'duplicate'
          ? 'Duplicate chapter skipped'
          : 'Upload failed',
      status: u.status,
      timestamp: u.createdAt,
    })),
    ...recentAttempts.map((a) => ({
      id: `practice-${a.id}`,
      type: 'practice' as const,
      title: a.chapter.title,
      subtitle: `Scored ${a.correctAnswers}/${a.totalQuestions} (${a.scorePercentage}%)`,
      status: 'completed',
      timestamp: a.completedAt,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return {
    totalChapters,
    uploadedChapters: totalChapters,
    activeChapters,
    totalQuestions: questionAggregate._sum.questionCount ?? 0,
    recentChapters,
    latestActivity,
  };
}

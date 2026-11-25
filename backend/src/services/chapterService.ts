import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { parseAndValidateChapterJsonMulti } from '../validation/chapterJsonParser';

export interface ChapterListQuery {
  userId: string;
  search?: string;
  category?: string;
  sort?: 'newest' | 'oldest' | 'title';
  page?: number;
  limit?: number;
  isActive?: boolean;
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

export async function listChapters(query: ChapterListQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 10));
  const skip = (page - 1) * limit;

  const where: Prisma.ChapterWhereInput = {
    userId: query.userId,
  };

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { chapterCode: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (query.category && query.category !== 'all') {
    where.category = query.category;
  }

  if (typeof query.isActive === 'boolean') {
    where.isActive = query.isActive;
  }

  let orderBy: Prisma.ChapterOrderByWithRelationInput = { createdAt: 'desc' };
  if (query.sort === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (query.sort === 'title') {
    orderBy = { title: 'asc' };
  }

  const [chapters, total, categoriesRaw] = await Promise.all([
    prisma.chapter.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        chapterCode: true,
        title: true,
        description: true,
        category: true,
        instructions: true,
        isActive: true,
        questionCount: true,
        sourceFileName: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            practiceAttempts: true,
          },
        },
      },
    }),
    prisma.chapter.count({ where }),
    prisma.chapter.findMany({
      where: { userId: query.userId },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    }),
  ]);

  return {
    chapters,
    categories: categoriesRaw.map((c) => c.category),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getChapterById(userId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      userId,
    },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          options: {
            orderBy: { optionOrder: 'asc' },
          },
        },
      },
      _count: {
        select: {
          practiceAttempts: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new AppError('Chapter not found.', 404);
  }

  return chapter;
}

export async function getChapterQuestions(userId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, userId },
    select: { id: true, title: true },
  });

  if (!chapter) {
    throw new AppError('Chapter not found.', 404);
  }

  const questions = await prisma.question.findMany({
    where: { chapterId },
    orderBy: { orderIndex: 'asc' },
    include: {
      options: {
        orderBy: { optionOrder: 'asc' },
      },
    },
  });

  return { chapter, questions };
}

export async function getQuestionById(userId: string, questionId: string) {
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      chapter: {
        userId,
      },
    },
    include: {
      options: {
        orderBy: { optionOrder: 'asc' },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          chapterCode: true,
        },
      },
    },
  });

  if (!question) {
    throw new AppError('Question not found.', 404);
  }

  return question;
}

export async function processUploadedChapterFiles(
  userId: string,
  files: Express.Multer.File[]
): Promise<FileUploadResult[]> {
  const results: FileUploadResult[] = [];

  for (const file of files) {
    const rawContent = file.buffer.toString('utf-8');

    try {
      const normalizedList = parseAndValidateChapterJsonMulti(
        rawContent,
        file.originalname
      );

      for (const normalized of normalizedList) {
        const existing = await prisma.chapter.findUnique({
          where: {
            userId_chapterCode: {
              userId,
              chapterCode: normalized.chapterCode,
            },
          },
          select: { id: true, title: true },
        });

        if (existing) {
          await prisma.uploadHistory.create({
            data: {
              userId,
              chapterId: existing.id,
              fileName: file.originalname,
              fileSize: file.size,
              status: 'duplicate',
              errorMessage: `Duplicate chapter_id "${normalized.chapterCode}" already exists as "${existing.title}".`,
              questionsCount: normalized.questions.length,
            },
          });

          results.push({
            fileName: file.originalname,
            fileSize: file.size,
            status: 'duplicate',
            message: `Chapter "${normalized.chapterCode}" already exists ("${existing.title}"). Duplicate uploads are prevented.`,
          });
          continue;
        }

        const createdChapter = await prisma.$transaction(
          async (tx) => {
            const chapter = await tx.chapter.create({
              data: {
                userId,
                chapterCode: normalized.chapterCode,
                title: normalized.title,
                description: normalized.description,
                category: normalized.category,
                instructions: normalized.instructions,
                isActive: true,
                questionCount: normalized.questions.length,
                sourceFileName: file.originalname,
              },
            });

            const questionRows: Prisma.QuestionCreateManyInput[] = [];
            const optionRows: Prisma.QuestionOptionCreateManyInput[] = [];

            for (const q of normalized.questions) {
              const questionId = randomUUID();
              questionRows.push({
                id: questionId,
                chapterId: chapter.id,
                externalQuestionId: q.externalQuestionId,
                orderIndex: q.orderIndex,
                questionText: q.questionText,
                questionType: q.questionType,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                difficulty: q.difficulty,
              });

              for (const opt of q.options) {
                optionRows.push({
                  id: randomUUID(),
                  questionId,
                  optionText: opt.optionText,
                  optionOrder: opt.optionOrder,
                  isCorrect: opt.isCorrect,
                });
              }
            }

            await tx.question.createMany({ data: questionRows });
            if (optionRows.length > 0) {
              await tx.questionOption.createMany({ data: optionRows });
            }

            await tx.uploadHistory.create({
              data: {
                userId,
                chapterId: chapter.id,
                fileName: file.originalname,
                fileSize: file.size,
                status: 'success',
                questionsCount: normalized.questions.length,
              },
            });

            return chapter;
          },
          {
            maxWait: 10000,
            timeout: 30000,
          }
        );

        results.push({
          fileName: file.originalname,
          fileSize: file.size,
          status: 'success',
          message: `Uploaded "${createdChapter.title}" with ${normalized.questions.length} questions.`,
          chapterId: createdChapter.id,
          chapterTitle: createdChapter.title,
          questionsCount: normalized.questions.length,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to parse or store chapter JSON.';

      await prisma.uploadHistory.create({
        data: {
          userId,
          fileName: file.originalname,
          fileSize: file.size,
          status: 'failed',
          errorMessage,
          questionsCount: 0,
        },
      });

      results.push({
        fileName: file.originalname,
        fileSize: file.size,
        status: 'error',
        message: errorMessage,
      });
    }
  }

  return results;
}

export async function updateChapter(
  userId: string,
  chapterId: string,
  input: {
    title?: string;
    description?: string;
    category?: string;
    instructions?: string | null;
    isActive?: boolean;
  }
) {
  const existing = await prisma.chapter.findFirst({
    where: { id: chapterId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Chapter not found.', 404);
  }

  return prisma.chapter.update({
    where: { id: chapterId },
    data: input,
  });
}

export async function deleteChapter(userId: string, chapterId: string) {
  const existing = await prisma.chapter.findFirst({
    where: { id: chapterId, userId },
    select: { id: true, title: true },
  });

  if (!existing) {
    throw new AppError('Chapter not found.', 404);
  }

  await prisma.chapter.delete({
    where: { id: chapterId },
  });

  return existing;
}

export async function getUploadHistory(userId: string) {
  return prisma.uploadHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          chapterCode: true,
        },
      },
    },
  });
}

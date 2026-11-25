import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as practiceService from '../services/practiceService';
import {
  savePracticeProgressSchema,
  submitPracticeSchema,
} from '../validation/authValidation';

export async function getProgress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const attempt = await practiceService.getPracticeProgress(
      req.user!.userId,
      req.params.chapterId
    );
    res.json({
      success: true,
      data: { attempt },
    });
  } catch (err) {
    next(err);
  }
}

export async function saveProgress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = savePracticeProgressSchema.parse(req.body);
    const attempt = await practiceService.savePracticeProgress({
      userId: req.user!.userId,
      chapterId: parsed.chapterId,
      currentIndex: parsed.currentIndex,
      questionId: parsed.questionId,
      selectedOption: parsed.selectedOption,
      answers: parsed.answers,
    });

    res.json({
      success: true,
      data: { attempt },
    });
  } catch (err) {
    next(err);
  }
}

export async function resetProgress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await practiceService.resetPracticeProgress(
      req.user!.userId,
      req.params.chapterId
    );
    res.json({
      success: true,
      message: 'Practice progress cleared.',
    });
  } catch (err) {
    next(err);
  }
}

export async function submitPractice(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = submitPracticeSchema.parse(req.body);
    const result = await practiceService.submitPracticeAttempt({
      userId: req.user!.userId,
      chapterId: parsed.chapterId,
      answers: parsed.answers,
    });

    res.status(201).json({
      success: true,
      message: 'Practice attempt submitted and saved.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const [attempts, inProgress] = await Promise.all([
      practiceService.getPracticeHistory(req.user!.userId),
      practiceService.getInProgressAttempts(req.user!.userId),
    ]);
    res.json({
      success: true,
      data: { attempts, inProgress },
    });
  } catch (err) {
    next(err);
  }
}

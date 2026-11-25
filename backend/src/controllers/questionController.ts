import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as chapterService from '../services/chapterService';

export async function getChapterQuestions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await chapterService.getChapterQuestions(
      req.user!.userId,
      String(req.params.id)
    );
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getQuestion(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const question = await chapterService.getQuestionById(
      req.user!.userId,
      String(req.params.id)
    );
    res.json({
      success: true,
      data: { question },
    });
  } catch (err) {
    next(err);
  }
}

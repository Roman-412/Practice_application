import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as chapterService from '../services/chapterService';

export async function getUploadHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const uploads = await chapterService.getUploadHistory(req.user!.userId);
    res.json({
      success: true,
      data: { uploads },
    });
  } catch (err) {
    next(err);
  }
}

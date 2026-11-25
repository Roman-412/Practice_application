import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import * as chapterService from '../services/chapterService';
import { updateChapterSchema } from '../validation/authValidation';

export async function listChapters(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const sortParam = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
    const sort =
      sortParam === 'oldest' || sortParam === 'title' ? sortParam : 'newest';
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const isActive =
      req.query.isActive === 'true'
        ? true
        : req.query.isActive === 'false'
        ? false
        : undefined;

    const result = await chapterService.listChapters({
      userId: req.user!.userId,
      search,
      category,
      sort,
      page,
      limit,
      isActive,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getChapter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const chapter = await chapterService.getChapterById(
      req.user!.userId,
      req.params.id
    );
    res.json({
      success: true,
      data: { chapter },
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadChapters(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new AppError('Please select at least one JSON file to upload.', 400);
    }

    const results = await chapterService.processUploadedChapterFiles(
      req.user!.userId,
      files
    );

    const successCount = results.filter((r) => r.status === 'success').length;
    const statusCode = successCount > 0 ? 201 : 400;

    res.status(statusCode).json({
      success: successCount > 0,
      message:
        successCount > 0
          ? `Successfully uploaded ${successCount} of ${results.length} file(s).`
          : 'No chapters were uploaded. Please check file errors below.',
      data: { results },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateChapter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = updateChapterSchema.parse(req.body);
    const chapter = await chapterService.updateChapter(
      req.user!.userId,
      req.params.id,
      parsed
    );

    res.json({
      success: true,
      message: 'Chapter updated successfully.',
      data: { chapter },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteChapter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const deleted = await chapterService.deleteChapter(
      req.user!.userId,
      req.params.id
    );
    res.json({
      success: true,
      message: `Chapter "${deleted.title}" deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
}

import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File size exceeds the 10MB limit.'
        : err.code === 'LIMIT_FILE_COUNT'
        ? 'Maximum 20 JSON files can be uploaded at once.'
        : err.message;
    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          message: 'A record with this unique identifier already exists.',
        });
        return;
      case 'P2025':
        res.status(404).json({
          success: false,
          message: 'Requested record was not found in the database.',
        });
        return;
      case 'P2003':
        res.status(400).json({
          success: false,
          message: 'Invalid reference: related record does not exist.',
        });
        return;
      case 'P1001':
      case 'P1017':
        res.status(503).json({
          success: false,
          message: 'Database connection is temporarily unavailable. Please retry.',
        });
        return;
      default:
        res.status(400).json({
          success: false,
          message: `Database operation failed (${err.code}).`,
        });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('Database initialization error code:', err.errorCode ?? 'unknown');
    res.status(503).json({
      success: false,
      message: 'Unable to establish database connection. Check server configuration.',
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('Prisma validation error:', err.message);
    res.status(400).json({
      success: false,
      message: 'Invalid database query parameters.',
    });
    return;
  }

  console.error('Unhandled error:', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.',
  });
}

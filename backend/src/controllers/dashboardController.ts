import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as dashboardService from '../services/dashboardService';

export async function getStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await dashboardService.getDashboardStats(req.user!.userId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

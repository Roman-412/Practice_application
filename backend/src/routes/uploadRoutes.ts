import { Router } from 'express';
import * as uploadController from '../controllers/uploadController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/history', uploadController.getUploadHistory);

export default router;

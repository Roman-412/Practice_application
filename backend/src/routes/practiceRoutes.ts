import { Router } from 'express';
import * as practiceController from '../controllers/practiceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/progress/:chapterId', practiceController.getProgress);
router.put('/progress', practiceController.saveProgress);
router.delete('/progress/:chapterId', practiceController.resetProgress);
router.post('/submit', practiceController.submitPractice);
router.get('/history', practiceController.getHistory);

export default router;

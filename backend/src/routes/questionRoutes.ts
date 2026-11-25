import { Router } from 'express';
import * as questionController from '../controllers/questionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/:id', questionController.getQuestion);

export default router;

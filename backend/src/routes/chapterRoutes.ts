import { Router } from 'express';
import * as chapterController from '../controllers/chapterController';
import * as questionController from '../controllers/questionController';
import { authMiddleware } from '../middleware/auth';
import { uploadJsonFiles } from '../middleware/upload';

const router = Router();

router.use(authMiddleware);

router.get('/', chapterController.listChapters);
router.post('/upload', uploadJsonFiles.array('files', 20), chapterController.uploadChapters);
router.get('/:id', chapterController.getChapter);
router.put('/:id', chapterController.updateChapter);
router.delete('/:id', chapterController.deleteChapter);
router.get('/:id/questions', questionController.getChapterQuestions);

export default router;

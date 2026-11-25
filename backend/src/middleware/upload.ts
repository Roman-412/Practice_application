import multer from 'multer';
import { AppError } from './errorHandler';

const storage = multer.memoryStorage();

export const uploadJsonFiles = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    const isJsonMime =
      file.mimetype === 'application/json' ||
      file.mimetype === 'text/json' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/octet-stream';
    const hasJsonExtension = file.originalname.toLowerCase().endsWith('.json');

    if (!hasJsonExtension && !isJsonMime) {
      cb(new AppError(`Invalid file type for "${file.originalname}". Only .json files are allowed.`, 400));
      return;
    }

    cb(null, true);
  },
});

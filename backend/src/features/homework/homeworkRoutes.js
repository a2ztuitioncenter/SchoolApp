import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  createHomework, getAllHomework,
  getHomeworkById, updateHomework, deleteHomework,
  getActiveAssignments
} from './homeworkController.js';
import { authorize } from '../../middleware/auth-middleware.js';

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/homework/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and PDF allowed'));
    }
  }
});

const router = express.Router();

router.get('/active', getActiveAssignments);
router.get('/', getAllHomework);
router.get('/:id', getHomeworkById);
router.post('/', authorize(['teacher', 'admin']), upload.single('attachment'), createHomework);
router.put('/:id', authorize(['teacher', 'admin']), upload.single('attachment'), updateHomework);
router.delete('/:id', authorize(['teacher', 'admin']), deleteHomework);

export default router;

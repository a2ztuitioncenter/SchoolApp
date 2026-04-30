import express from 'express';
import multer from 'multer';
import path from 'path';
import { getAllNotifications, createNotification, deleteNotification } from './notificationsController.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/notifications/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'notice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const router = express.Router();

router.get('/', getAllNotifications);
router.post('/', upload.single('attachment'), createNotification);
router.delete('/:id', deleteNotification);

export default router;

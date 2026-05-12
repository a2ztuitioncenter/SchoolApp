import express from 'express';
import multer from 'multer';
import path from 'path';
import { getAllNotifications, createNotification, deleteNotification } from './notificationsController.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = express.Router();

router.get('/', getAllNotifications);
router.post('/', authorize('admin'), upload.single('attachment'), createNotification);
router.delete('/:id', authorize('admin'), deleteNotification);

export default router;

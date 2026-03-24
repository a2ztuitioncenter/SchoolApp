import express from 'express';
import { getAllNotifications, createNotification } from '../controllers/notificationsController.js';

const router = express.Router();

router.get('/', getAllNotifications);
router.post('/', createNotification);

export default router;

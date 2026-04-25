import express from 'express';
import { getActiveAssignments } from './homeworkController.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';

const router = express.Router();

// Get active assignments for the current student
router.get('/active', authenticate, authorize(['student', 'admin', 'teacher', 'staff']), getActiveAssignments);

export default router;

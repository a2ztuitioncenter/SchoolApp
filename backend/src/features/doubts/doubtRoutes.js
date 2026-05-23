import express from 'express';
import { createDoubt, getStudentDoubts, getTeacherDoubts, answerDoubt } from './doubtController.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';

const router = express.Router();

// Require authentication for all routes
router.use(authenticate);

// Student routes
router.post('/', authorize(['student']), createDoubt);
router.get('/student', authorize(['student']), getStudentDoubts);

// Teacher/Admin/Staff routes
router.get('/teacher', authorize(['teacher', 'staff', 'admin']), getTeacherDoubts);
router.put('/:id/answer', authorize(['teacher', 'staff', 'admin']), answerDoubt);

export default router;

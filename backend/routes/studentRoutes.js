// studentRoutes.js - Student data endpoints
import express from 'express';
import {
  getStudentDashboard,
  getStudentAttendance,
  getStudentFees,
} from '../controllers/dataController.js';

const router = express.Router();

/**
 * GET /api/student/:userId/dashboard
 * Returns: Complete dashboard data (profile, attendance, fees, homework, progress)
 */
router.get('/:userId/dashboard', getStudentDashboard);

/**
 * GET /api/student/:userId/attendance
 * Returns: Attendance records and summary
 */
router.get('/:userId/attendance', getStudentAttendance);

/**
 * GET /api/student/:userId/fees
 * Returns: Fee records and pending amount
 */
router.get('/:userId/fees', getStudentFees);

export default router;

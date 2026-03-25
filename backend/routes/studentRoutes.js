// studentRoutes.js - Student data endpoints
import express from 'express';
import {
  getStudentDashboard,
  getStudentAttendance,
  getStudentFees,
} from '../controllers/dataController.js';
import { getHomeworkByClass } from '../models/Homework.js';

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

/**
 * GET /api/student/:userId/homework
 * Returns: Homework assigned to student's class
 */
router.get('/:userId/homework', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    // Get student info to find their class
    const studentResult = await pool.query(
      'SELECT "classLevel", section FROM students WHERE "userId" = $1',
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { classLevel, section } = studentResult.rows[0] || {};

    // Get homework matching the numeric portion of the student's classLevel
    const homeworkResult = await pool.query(
      'SELECT h.*, u.phone AS "teacherPhone" FROM homework h LEFT JOIN users u ON h."teacherId" = u.id WHERE substring(h."classLevel" FROM \'\\d+\') = substring($1 FROM \'\\d+\') ORDER BY h."createdAt" DESC',
      [classLevel]
    );
    const homework = homeworkResult.rows;

    return res.json({
      success: true,
      classLevel,
      section,
      homework: homework,
      count: homework.length,
    });
  } catch (error) {
    console.error('Error fetching student homework:', error);
    return res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

export default router;

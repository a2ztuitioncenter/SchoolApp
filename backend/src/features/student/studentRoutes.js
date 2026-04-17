// studentRoutes.js - Student data endpoints
import express from 'express';
import { requireSelfOrAdmin } from '../../middleware/auth-middleware.js';
import {
  getStudentDashboard,
  getStudentAttendance,
  getStudentFees,
} from './dataController.js';

const router = express.Router();

router.use('/:userId', requireSelfOrAdmin('userId'));

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
 * GET /api/student/:userId/results
 * Returns: Exam results for authenticated student only
 */
router.get('/:userId/results', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) return res.status(400).json({ error: 'Invalid userId format' });

    // Get student details (roll_number and name)
    const studentResult = await pool.query(
      'SELECT roll_number, name FROM students WHERE user_id = $1',
      [parsedUserId]
    );

    if (studentResult.rows.length === 0) return res.json({ data: [] });

    const { roll_number, name } = studentResult.rows[0];

    // Fetch results using exam_results table (snake_case)
    const results = await pool.query(
      `SELECT * FROM exam_results 
       WHERE roll_number = $1 OR student_name = $2
       ORDER BY created_at DESC`,
      [roll_number, name]
    );

    res.json({ data: results.rows });
  } catch (err) {
    console.error(`❌ [STUDENT RESULTS] Error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/student/:userId/homework
 * Returns: Homework assigned to student's class
 */
router.get('/:userId/homework', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    const studentResult = await pool.query(
      'SELECT class_level, section FROM students WHERE user_id = $1',
      [userId]
    );

    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const { class_level, section } = studentResult.rows[0];

    // Get homework matching classLevel and section (snake_case)
    const homeworkResult = await pool.query(
      `SELECT h.*, u.phone AS teacher_phone 
       FROM homework h 
       LEFT JOIN users u ON h.teacher_id = u.id 
       WHERE h.class_level = $1 AND (h.section = $2 OR h.section = 'ALL')
       ORDER BY h.created_at DESC`,
      [class_level, section]
    );

    return res.json({
      success: true,
      classLevel: class_level,
      section,
      homework: homeworkResult.rows,
      count: homeworkResult.rows.length,
    });
  } catch (error) {
    console.error('Error fetching student homework:', error);
    return res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

/**
 * GET /api/student/:userId/syllabus
 * Returns: Syllabus items targeted at student's class
 */
router.get('/:userId/syllabus', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    const studentResult = await pool.query(
      'SELECT class_level, section FROM students WHERE user_id = $1',
      [userId]
    );

    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const { class_level, section } = studentResult.rows[0];

    const syllabusResult = await pool.query(
      `SELECT s.*, u.name AS teacher_name 
       FROM syllabus s 
       LEFT JOIN users u ON s.teacher_id = u.id 
       WHERE s.class_level = $1 AND (s.section = $2 OR s.section = 'ALL')
       ORDER BY s.subject ASC, s.created_at ASC`,
      [class_level, section]
    );

    return res.json({
      success: true,
      syllabus: syllabusResult.rows
    });
  } catch (error) {
    console.error('Error fetching student syllabus:', error);
    return res.status(500).json({ error: 'Failed to fetch syllabus' });
  }
});

export default router;

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

    // Get student details (rollNumber and name)
    const studentResult = await pool.query(
      'SELECT id, "rollNumber", name FROM students WHERE "userId" = $1',
      [parsedUserId]
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { id: studentId, rollNumber, name } = studentResult.rows[0];

    // Fetch results using exam_results table
    const results = await pool.query(
      `SELECT er.*, s."rollNumber" as "roll_no"
       FROM exam_results er
       LEFT JOIN students s ON er."studentId" = s.id
       WHERE er."studentId" = $1
       ORDER BY er."createdAt" DESC`,
      [studentId]
    );

    const resultData = results.rows;

    if (!resultData || resultData.length === 0) {
      return res.json({ success: true, data: [] });
    }

    res.json({ success: true, data: resultData });
  } catch (err) {
    console.error(`❌ [STUDENT RESULTS] Error:`, err.message);
    console.error(`❌ [STUDENT RESULTS] Stack:`, err.stack);
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
      'SELECT "classLevel", section FROM students WHERE "userId" = $1',
      [userId]
    );

    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const { classLevel, section } = studentResult.rows[0];

    // Get homework matching classLevel and section (camelCase in DB)
    const homeworkResult = await pool.query(
      `SELECT h.*, u.phone AS teacher_phone 
       FROM homework h 
       LEFT JOIN users u ON h."teacherId" = u.id 
       WHERE h."classLevel" = $1 AND (h.section = $2 OR h.section = 'ALL')
       ORDER BY h."createdAt" DESC`,
      [classLevel, section]
    );

    // Map to camelCase (DB columns are already camelCase, but mapping for consistency or if some are different)
    const homework = (homeworkResult.rows || []).map(h => ({
      ...h,
      classLevel: h.classLevel,
      dueDate: h.dueDate,
      teacherId: h.teacherId,
      attachmentUrl: h.attachmentUrl
    }));

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

/**
 * GET /api/student/:userId/syllabus
 * Returns: Syllabus items targeted at student's class
 */
router.get('/:userId/syllabus', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    const studentResult = await pool.query(
      'SELECT "classLevel", section FROM students WHERE "userId" = $1',
      [userId]
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      console.log(`⚠️ [SYLLABUS] Student not found for userId: ${userId}`);
      return res.status(404).json({ error: 'Student not found' });
    }

    const { classLevel, section } = studentResult.rows[0];

    // Handle empty classLevel to prevent invalid queries
    if (!classLevel || classLevel.trim() === "") {
      return res.json({
        success: true,
        syllabus: [],
        message: 'No class assigned to student'
      });
    }

    const syllabusResult = await pool.query(
      `SELECT s.*, u.name AS teacher_name 
       FROM syllabus s 
       LEFT JOIN users u ON s."teacherId" = u.id 
       WHERE s."classLevel" = $1 AND (s.section = $2 OR s.section = 'ALL' OR $2 = 'ALL')
       ORDER BY s.subject ASC, s."createdAt" ASC`,
      [classLevel, section || 'ALL']
    );

    return res.json({
      success: true,
      syllabus: syllabusResult.rows || []
    });
  } catch (error) {
    console.error(`❌ [SYLLABUS ERROR] StudentID ${req.params.userId}:`, error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch syllabus',
      error: error.message 
    });
  }
});

export default router;

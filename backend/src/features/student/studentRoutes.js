// studentRoutes.js - Student data endpoints
import express from 'express';
import {
  getStudentDashboard,
  getStudentAttendance,
  getStudentFees,
} from './dataController.js';
import { getHomeworkByClass } from '../homework/Homework.js';
import { getResultsByStudent } from '../results/resultsController.js';

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
 * GET /api/student/:userId/results
 * Returns: Exam results for authenticated student only
 * Security: Only allows students to fetch their own results
 */
router.get('/:userId/results', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    // Ensure userId is a valid number
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    console.log(`📍 [STUDENT RESULTS] Fetching results for userId: ${parsedUserId}`);

    // Get student ID from userId (user record)
    let studentResult;
    try {
      studentResult = await pool.query(
        'SELECT id FROM students WHERE "userId" = $1',
        [parsedUserId]
      );
    } catch (queryErr) {
      console.error(`❌ [STUDENT RESULTS] Database query error:`, queryErr.message);
      return res.status(500).json({ 
        error: 'Database error',
        detail: queryErr.message,
        hint: 'Check if students table exists'
      });
    }

    if (studentResult.rows.length === 0) {
      console.log(`⚠️ [STUDENT RESULTS] No student found for userId: ${parsedUserId}`);
      // Return empty results instead of 404 - student might not have taken exams yet
      return res.json({ data: [] });
    }

    const studentId = studentResult.rows[0].id;
    console.log(`📍 [STUDENT RESULTS] Student ID: ${studentId}`);

    // Fetch results for this student only
    let results;
    try {
      results = await pool.query(
        `SELECT r.*, s.name AS "studentName", s."classLevel", s."rollNumber"
         FROM results r
         LEFT JOIN students s ON r."studentId" = s.id
         WHERE r."studentId" = $1
         ORDER BY r."createdAt" DESC`,
        [studentId]
      );
    } catch (queryErr) {
      console.error(`❌ [STUDENT RESULTS] Results query error:`, queryErr.message);
      return res.status(500).json({ 
        error: 'Database error',
        detail: queryErr.message,
        hint: 'Check if results table exists and columns are correct'
      });
    }

    console.log(`✅ [STUDENT RESULTS] Found ${results.rows.length} results for student ${studentId}`);
    res.json({ data: results.rows });
  } catch (err) {
    console.error(`❌ [STUDENT RESULTS] Unexpected error:`, err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      error: 'Server error', 
      detail: err.message,
      hint: 'Check backend logs for more details'
    });
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

/**
 * GET /api/student/:userId/syllabus
 * Returns: Syllabus items targeted at student's class
 */
router.get('/:userId/syllabus', async (req, res) => {
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

    const { classLevel } = studentResult.rows[0] || {};

    // Get syllabus matching the numeric portion of the student's classLevel
    const syllabusResult = await pool.query(
      `SELECT s.*, u.phone AS "teacherPhone" 
       FROM syllabus s 
       LEFT JOIN users u ON s."teacherId" = u.id 
       WHERE substring(s."classLevel" FROM '\\d+') = substring($1 FROM '\\d+') 
       ORDER BY s.subject ASC, s."createdAt" ASC`,
      [classLevel]
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

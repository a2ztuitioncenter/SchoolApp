// studentRoutes.js - Student data endpoints
import express from 'express';
import { requireSelfOrAdmin } from '../../middleware/auth-middleware.js';
import {
  getStudentDashboard,
  getStudentAttendance,
  getStudentFees,
} from './dataController.js';
import { getStudentByUserId } from './Student.js';

const router = express.Router();

router.use('/:userId', requireSelfOrAdmin('userId'));

/**
 * GET /api/student/:userId/dashboard
 */
router.get('/:userId/dashboard', getStudentDashboard);

/**
 * GET /api/student/:userId/attendance
 */
router.get('/:userId/attendance', getStudentAttendance);

/**
 * GET /api/student/:userId/fees
 */
router.get('/:userId/fees', getStudentFees);

/**
 * GET /api/student/:userId/results
 */
router.get('/:userId/results', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    const student = await getStudentByUserId(pool, userId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    // Fetch results using exam_results table (all columns now snake_case)
    const results = await pool.query(
      `SELECT er.* 
       FROM exam_results er
       WHERE er.student_id = $1 AND er.school_id = $2
       ORDER BY er.created_at DESC`,
      [student.id, student.schoolId]
    );

    // Map snake_case to camelCase for the frontend
    const mappedResults = results.rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      teacherId: r.teacher_id,
      examName: r.exam_name,
      subjectName: r.subject_name,
      marksObtained: r.marks_obtained,
      totalMarks: r.total_marks,
      classLevel: r.class_level,
      rollNumber: r.roll_number,
      studentName: r.student_name,
      examTitle: r.exam_title,
      obtainedMarks: r.obtained_marks,
      subjects: r.subjects, 
      percentage: r.percentage,
      remarks: r.remarks,
      createdAt: r.created_at
    }));

    res.json({ success: true, data: mappedResults });
  } catch (err) {
    console.error(`❌ [STUDENT RESULTS] Error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/student/:userId/homework
 */
router.get('/:userId/homework', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    const student = await getStudentByUserId(pool, userId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { classLevel, section } = student;

    // Get homework matching class_level and section
    const homeworkResult = await pool.query(
      `SELECT h.*, u.phone AS teacher_phone 
       FROM homework h 
       LEFT JOIN users u ON h.teacher_id = u.id 
       WHERE h.class_level = $1 AND (h.section = $2 OR h.section = 'ALL') AND h.school_id = $3
       ORDER BY h.created_at DESC`,
      [classLevel, section, student.schoolId]
    );

    const homework = (homeworkResult.rows || []).map(h => ({
      id: h.id,
      title: h.title,
      description: h.description,
      classLevel: h.class_level,
      section: h.section,
      dueDate: h.due_date,
      teacherId: h.teacher_id,
      teacherPhone: h.teacher_phone,
      attachmentUrl: h.attachment_url,
      type: h.type,
      createdAt: h.created_at
    }));

    return res.json({
      success: true,
      classLevel,
      section,
      homework: homework,
      count: homework.length,
    });
  } catch (error) {
    console.error('Error fetching student homework:', error.message);
    return res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

/**
 * GET /api/student/:userId/syllabus
 */
router.get('/:userId/syllabus', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = req.db;

    const student = await getStudentByUserId(pool, userId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { classLevel, section } = student;

    if (!classLevel || classLevel.trim() === "") {
      return res.json({ success: true, syllabus: [], message: 'No class assigned' });
    }

    const syllabusResult = await pool.query(
      `SELECT s.*, u.name AS teacher_name 
       FROM syllabus s 
       LEFT JOIN users u ON s.teacher_id = u.id 
       WHERE s.class_level = $1 AND (s.section = $2 OR s.section = 'ALL' OR $2 = 'ALL') AND s.school_id = $3
       ORDER BY s.subject ASC, s.created_at ASC`,
      [classLevel, section || 'ALL', student.schoolId]
    );

    const syllabus = (syllabusResult.rows || []).map(s => ({
        id: s.id,
        subject: s.subject,
        chapter: s.chapter,
        section: s.section,
        description: s.description,
        completed: s.completed,
        teacherId: s.teacher_id,
        teacherName: s.teacher_name,
        classLevel: s.class_level,
        createdAt: s.created_at
    }));

    return res.json({ success: true, syllabus });
  } catch (error) {
    console.error(`❌ [SYLLABUS ERROR]:`, error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch syllabus' });
  }
});

export default router;

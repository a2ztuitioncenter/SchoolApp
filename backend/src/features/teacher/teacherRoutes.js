import express from 'express';
import multer from 'multer';
import path from 'path';
import { getUserById } from '../auth/User.js';
import {
  getHomeworkByTeacher,
  createHomework,
  updateHomework,
  deleteHomework,
} from '../homework/Homework.js';
import { syllabusModel, getSyllabusByTeacher, createSyllabusEntry, updateSyllabusEntry, deleteSyllabusEntry } from './syllabusModel.js';
import { createExamResult, getExamResults } from './examController.js';
import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

const router = express.Router();

// ============================================
// MULTER — Homework & Materials Upload
// ============================================
const makeStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, `uploads/${folder}/`),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${folder}-${unique}${path.extname(file.originalname)}`);
    },
  });

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG and PDF allowed'));
};

const uploadHomework = multer({ storage: makeStorage('homework'), fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadMaterial = multer({ storage: makeStorage('materials'), fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// ============================================
// AUTH GUARD HELPER
// ============================================
async function requireTeacher(req, suppliedTeacherId = null) {
  const authenticatedTeacherId = parseInt(req.user?.userId, 10);
  const requestedTeacherId = (suppliedTeacherId === null || suppliedTeacherId === undefined || suppliedTeacherId === '' || suppliedTeacherId === 'me')
    ? authenticatedTeacherId
    : parseInt(suppliedTeacherId, 10);

  if (!authenticatedTeacherId || Number.isNaN(authenticatedTeacherId) || Number.isNaN(requestedTeacherId)) {
    return null;
  }


  const teacher = await getUserById(req.db, authenticatedTeacherId);
  if (!teacher) return null;

  if (teacher.role === 'admin') {
    const requestedTeacher = await getUserById(req.db, requestedTeacherId);
    if (!requestedTeacher) return null; // Let caller handle 403/404
    return requestedTeacher;
  }

  // Identity check: Non-admins can only access their own data
  if (authenticatedTeacherId !== requestedTeacherId) {
    return null;
  }

  // Role check: Must be teacher or staff
  return (teacher.role === 'teacher' || teacher.role === 'staff') ? teacher : null;
}

// Check if teacher is assigned to teach a class
async function checkTeacherClassPermission(pool, teacherId, classLevel, section) {
  try {
    // Check new subject_assignments table first
    const subjectRes = await pool.query(
      `SELECT COUNT(*) as count FROM subject_assignments 
       WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL OR $3 IS NULL OR $3 = 'ALL')`,
      [teacherId, classLevel, section]
    );
    if (subjectRes.rows[0].count > 0) return true;

    // Fallback to legacy teacher_class_assignment (now migrated to snake_case)
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL OR $3 IS NULL OR $3 = 'ALL')`,
      [teacherId, classLevel, section]
    );
    return result.rows[0].count > 0;
  } catch (err) {
    console.error('Error checking class permission:', err);
    return false;
  }
}

// ============================================
// DASHBOARD — enriched with timetable & stats
// ============================================
router.get('/dashboard/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const pool = req.db;
    const parsedTeacherId = parseInt(req.user.userId, 10);


    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) {
      console.warn(`[TEACHER] Authorization failed for teacherId=${teacherId}`);
      return res.status(403).json({ success: false, error: 'Unauthorized access to teacher data' });
    }

    // 1. Get Assigned Classes from both tables
    const [subAssignRes, tcaAssignRes] = await Promise.all([
      pool.query(
        `SELECT DISTINCT class_level FROM subject_assignments WHERE teacher_id = $1`,
        [teacher.id]
      ),
      pool.query(
        `SELECT DISTINCT class_level FROM teacher_class_assignment WHERE teacher_id = $1`,
        [teacher.id]
      )
    ]);

    // Merge results
    const mergedAssignments = [...subAssignRes.rows, ...tcaAssignRes.rows];
    let classes = [...new Set(mergedAssignments.map(r => r.class_level).filter(c => c !== null && c !== undefined && c !== ''))];

    // 2. Fallback: If no assignments found, get from timetable
    if (classes.length === 0) {
      const ttRes = await pool.query(
        'SELECT DISTINCT class_level FROM timetable WHERE teacher_id = $1 ORDER BY class_level',
        [teacher.id]
      );
      classes = ttRes.rows.map(r => r.class_level);
    }

    // 3. Get Timetable with Subject Names
    const ttRes = await pool.query(
      `SELECT t.*, s.name as subject 
       FROM timetable t 
       LEFT JOIN subjects s ON t.subject_id = s.id 
       WHERE t.teacher_id = $1 
       ORDER BY t.day_of_week, t.start_time`,
      [teacher.id]
    );

    // 4. Get Homework & Student Count
    const [hwRes, studRes] = await Promise.all([
      pool.query(
        'SELECT * FROM homework WHERE teacher_id = $1 ORDER BY created_at DESC',
        [teacher.id]
      ),
      pool.query(
        `SELECT COUNT(id) AS total_students FROM students 
             WHERE (class_level, section) IN (
               SELECT class_level, section FROM subject_assignments WHERE teacher_id = $1
               UNION
               SELECT class_level, section FROM teacher_class_assignment WHERE teacher_id = $1
             )
             OR class_level IN (
               SELECT class_level FROM subject_assignments WHERE teacher_id = $1 AND (section IS NULL OR section = 'ALL')
               UNION
               SELECT class_level FROM teacher_class_assignment WHERE teacher_id = $1 AND (section IS NULL OR section = 'ALL')
             )`,
        [teacher.id]
      )
    ]);

    res.json({
      success: true,
      teacher: {
        id: teacher.id,
        phone: teacher.phone,
        role: teacher.role,
        name: teacher.name,
        email: teacher.email,
        teacherId: teacher.teacherId
      },
      stats: {
        totalHomework: hwRes.rows.length,
        totalClasses: classes.length,
        totalStudents: parseInt(studRes.rows[0].total_students || 0),
      },
      classes: classes.map(c => ({ classLevel: c })),
      homework: hwRes.rows.map(h => ({
        id: h.id,
        title: h.title,
        description: h.description,
        classLevel: h.class_level,
        section: h.section,
        dueDate: h.due_date,
        createdAt: h.created_at,
        type: h.type
      })),
      timetable: ttRes.rows.map(t => ({
        id: t.id,
        classLevel: t.class_level,
        section: t.section,
        subjectId: t.subject_id,
        teacherId: t.teacher_id,
        dayOfWeek: t.day_of_week,
        startTime: t.start_time,
        endTime: t.end_time
      })),
    });
  } catch (err) {
    console.error('[TEACHER] Dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/teacher/timetable/:teacherId
router.get('/timetable/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const res2 = await pool.query(
      `SELECT t.*, s.name as subject 
       FROM timetable t 
       LEFT JOIN subjects s ON t.subject_id = s.id 
       WHERE t.teacher_id = $1 
       ORDER BY t.day_of_week, t.start_time`,
      [teacher.id]
    );
    res.json({
      success: true, data: res2.rows.map(t => ({
        id: t.id,
        classLevel: t.class_level,
        section: t.section,
        subjectId: t.subject_id,
        teacherId: t.teacher_id,
        dayOfWeek: t.day_of_week,
        startTime: t.start_time,
        endTime: t.end_time
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch timetable' });
  }
});

// GET /api/teacher/attendance/classes
router.get('/attendance/classes', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const [subRes, tcaRes] = await Promise.all([
      pool.query(
        `SELECT DISTINCT class_level FROM subject_assignments WHERE teacher_id = $1`,
        [teacher.id]
      ),
      pool.query(
        `SELECT DISTINCT class_level FROM teacher_class_assignment WHERE teacher_id = $1`,
        [teacher.id]
      )
    ]);

    const merged = [...subRes.rows, ...tcaRes.rows];
    let classes = [...new Set(merged.map(r => r.class_level))];

    if (classes.length === 0) {
      const ttResult = await pool.query(
        `SELECT DISTINCT class_level FROM timetable WHERE teacher_id = $1 ORDER BY class_level`,
        [teacher.id]
      );
      classes = ttResult.rows.map(r => r.class_level);
    }

    res.json({ success: true, data: classes.map(c => ({ class_level: c })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch classes' });
  }
});

// GET /api/teacher/attendance/sections
router.get('/attendance/sections', async (req, res) => {
  try {
    const { teacherId, classLevel } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });
    if (!classLevel) return res.status(400).json({ success: false, error: 'classLevel required' });

    const [subRes, tcaRes] = await Promise.all([
      pool.query(
        `SELECT DISTINCT section FROM subject_assignments WHERE teacher_id = $1 AND class_level = $2`,
        [teacher.id, classLevel]
      ),
      pool.query(
        `SELECT DISTINCT section FROM teacher_class_assignment WHERE teacher_id = $1 AND class_level = $2`,
        [teacher.id, classLevel]
      )
    ]);

    const assignedSections = [...new Set([...subRes.rows, ...tcaRes.rows].map(r => r.section))];

    let result;
    if (assignedSections.includes('ALL') || assignedSections.includes(null) || assignedSections.includes('')) {
      result = await pool.query(
        `SELECT DISTINCT section FROM students WHERE class_level = $1 AND section IS NOT NULL ORDER BY section`,
        [classLevel]
      );
    } else if (assignedSections.length > 0) {
      result = await pool.query(
        `SELECT DISTINCT section FROM students WHERE class_level = $1 AND section = ANY($2) AND section IS NOT NULL ORDER BY section`,
        [classLevel, assignedSections]
      );
    } else {
      // Fallback to timetable
      result = await pool.query(
        `SELECT DISTINCT section FROM timetable WHERE teacher_id = $1 AND class_level = $2 AND section IS NOT NULL ORDER BY section`,
        [teacher.id, classLevel]
      );
    }

    const sections = result.rows.map(r => r.section);
    res.json({ success: true, data: sections });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch sections' });
  }
});

// GET /api/teacher/attendance/sheet
router.get('/attendance/sheet', async (req, res) => {
  try {
    const { teacherId, classLevel, date, section } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });
    if (!classLevel || !date) return res.status(400).json({ success: false, error: 'classLevel and date required' });

    const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this class' });
    }

    let studentsQuery = `SELECT id, name, roll_number FROM students WHERE class_level = $1`;
    let studentsParams = [classLevel];
    if (section) {
      studentsQuery += ` AND section = $2`;
      studentsParams.push(section);
    }
    studentsQuery += ` ORDER BY name`;

    let existingQuery = `SELECT a.student_id, a.is_present FROM attendance a
                        JOIN students s ON a.student_id = s.id
                        WHERE s.class_level = $1`;
    let existingParams = [classLevel];
    if (section) {
      existingQuery += ` AND s.section = $2`;
      existingParams.push(section);
    }
    existingQuery += ` AND a.date = $${existingParams.length + 1}`;
    existingParams.push(date);

    const [students, existing] = await Promise.all([
      pool.query(studentsQuery, studentsParams),
      pool.query(existingQuery, existingParams),
    ]);

    const attMap = {};
    existing.rows.forEach(a => { attMap[a.student_id] = a.is_present ? 'present' : 'absent'; });

    res.json({
      success: true,
      students: students.rows.map(s => ({ id: s.id, name: s.name, rollNumber: s.roll_number })),
      existing: attMap,
    });
  } catch (err) {
    console.error('Sheet error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch sheet' });
  }
});

// POST /api/teacher/attendance/mark-bulk
router.post('/attendance/mark-bulk', async (req, res) => {
  try {
    const { teacherId, records } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ success: false, error: 'records array required' });

    // Security check: Verify teacher has permission for all classes/sections in the batch
    const first = records[0];
    const classLevel = first.classLevel;
    const section = first.section || null;

    const allMatch = records.every(r => r.classLevel === classLevel && (r.section || null) === section);
    if (!allMatch) {
      return res.status(400).json({ success: false, error: 'Bulk attendance must belong to a single class and section' });
    }

    const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission for this class/section' });
    }

    // Verify all student IDs exist, are in the correct class/section, and share the school boundary
    const uniqueStudentIds = [...new Set(records.map(r => r.studentId))];
    let studentCheckQuery = `SELECT COUNT(*) as count FROM students 
                             WHERE id = ANY($1) 
                               AND class_level = $2 
                               AND school_id = $3`;
    let studentCheckParams = [uniqueStudentIds, classLevel, req.user.schoolId];
    if (section) {
      studentCheckQuery += ` AND (section = $4 OR (section IS NULL AND $4 = 'A'))`;
      studentCheckParams.push(section);
    } else {
      studentCheckQuery += ` AND (section IS NULL OR section = 'A')`;
    }

    const studentCheckRes = await pool.query(studentCheckQuery, studentCheckParams);
    if (parseInt(studentCheckRes.rows[0].count, 10) !== uniqueStudentIds.length) {
      return res.status(403).json({ success: false, error: 'Forbidden: One or more students do not belong to the authorized class, section, or school boundary' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of records) {
        // Validate status: must be 'present' or 'absent'
        if (r.status !== 'present' && r.status !== 'absent') {
          throw new Error(`Invalid attendance status: ${r.status} for student ${r.studentId}`);
        }
        const isPresent = r.status === 'present';
        await client.query(
          `INSERT INTO attendance (student_id, user_id, class_level, section, date, is_present)
         VALUES ($1, (SELECT user_id FROM students WHERE id = $1), $2, $3, $4, $5)
         ON CONFLICT (student_id, date)
         DO UPDATE SET is_present = EXCLUDED.is_present, class_level = EXCLUDED.class_level, section = EXCLUDED.section`,
          [r.studentId, r.classLevel, r.section || null, r.date, isPresent]
        );
      }
      await client.query('COMMIT');
    } catch (bulkError) {
      await client.query('ROLLBACK');
      throw bulkError;
    } finally {
      client.release();
    }
    res.json({ success: true, message: `Saved ${records.length} attendance records` });
  } catch (err) {
    console.error('Mark bulk error:', err);
    res.status(500).json({ success: false, error: 'Failed to save attendance' });
  }
});

// GET /api/teacher/attendance/summary
router.get('/attendance/summary', async (req, res) => {
  try {
    const { teacherId, classLevel, month, section } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission for this class/section' });
    }

    let query = `SELECT s.name, s.id AS student_id,
          COUNT(CASE WHEN a.is_present = true THEN 1 END) AS present_count,
          COUNT(CASE WHEN a.is_present = false THEN 1 END) AS absent_count,
          COUNT(a.id) AS total_days,
          ROUND(
            COUNT(CASE WHEN a.is_present = true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1
          ) AS attendance_percent
        FROM students s
        LEFT JOIN attendance a ON a.student_id = s.id AND TO_CHAR(a.date, 'YYYY-MM') = $${section ? 3 : 2}
        WHERE s.class_level = $1`;

    let params = [classLevel, month];
    if (section) {
      query += ` AND s.section = $2`;
      params = [classLevel, section, month];
    }
    query += ` GROUP BY s.id, s.name ORDER BY s.name`;

    const result = await pool.query(query, params);
    res.json({
      success: true, data: result.rows.map(r => ({
        name: r.name,
        studentId: r.student_id,
        presentCount: r.present_count,
        absentCount: r.absent_count,
        totalDays: r.total_days,
        attendancePercent: r.attendance_percent
      }))
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ success: false, error: 'Failed to load summary' });
  }
});

// ============================================
// HOMEWORK — teacher-scoped CRUD with upload
// ============================================

router.get('/homework', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const homework = await getHomeworkByTeacher(pool, teacher.id);
    res.json({ success: true, data: homework });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch homework' });
  }
});

router.post('/homework', uploadHomework.single('attachment'), async (req, res) => {
  try {
    const { teacherId, dueDate, type } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeNullableText(req.body.subject, 100);
    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    if (!classLevel || !title) return res.status(400).json({ success: false, error: 'classLevel and title required' });
    if (type !== 'daily_practice' && !dueDate) return res.status(400).json({ success: false, error: 'dueDate required' });

    // Verify teacher has permission for this class
    if (teacher.role !== 'admin') {
      const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'You do not have permission to assign homework to this class' });
      }
    }

    const attachmentUrl = req.file ? `/uploads/homework/${req.file.filename}` : (req.body.fileUrl || null);
    const finalDueDate = type === 'daily_practice' ? null : dueDate;
    const hw = await createHomework(pool, { teacherId: teacher.id, classLevel, section, subject, title, description, dueDate: finalDueDate, attachmentUrl, type });
    res.status(201).json({ success: true, data: hw });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create homework' });
  }
});

router.put('/homework/:id', uploadHomework.single('attachment'), async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, dueDate, type } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });
    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    const subject = sanitizeNullableText(req.body.subject, 100);

    const own = await pool.query('SELECT teacher_id, class_level, section FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ success: false, error: 'Homework not found' });

    // Check if teacher can edit
    const homework = own.rows[0];
    const canEdit = homework.teacher_id === teacher.id ||
      await checkTeacherClassPermission(pool, teacher.id, homework.class_level, homework.section);

    if (!canEdit) return res.status(403).json({ success: false, error: 'Not authorized to edit this homework' });

    const attachmentUrl = req.file ? `/uploads/homework/${req.file.filename}` : (req.body.fileUrl || undefined);
    const finalDueDate = type === 'daily_practice' ? null : dueDate;
    const updated = await updateHomework(pool, id, { title, description, dueDate: finalDueDate, subject, attachmentUrl, type });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update homework' });
  }
});

router.delete('/homework/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const own = await pool.query('SELECT teacher_id, class_level, section FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ success: false, error: 'Homework not found' });

    const homework = own.rows[0];
    const canDelete = homework.teacher_id === teacher.id ||
      await checkTeacherClassPermission(pool, teacher.id, homework.class_level, homework.section);

    if (!canDelete) return res.status(403).json({ success: false, error: 'Not authorized to delete this homework' });

    await deleteHomework(pool, id);
    res.json({ success: true, message: 'Homework deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete homework' });
  }
});

// ============================================
// STUDY MATERIALS — teacher-scoped CRUD
// ============================================

router.get('/materials', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);

    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT * FROM materials 
       WHERE uploaded_by_id = $1 
       ORDER BY created_at DESC`,
      [teacher.id]
    );

    res.json({
      success: true, data: result.rows.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        subject: m.subject,
        classLevel: m.class_level,
        section: m.section,
        fileUrl: m.file_url,
        uploadedById: m.uploaded_by_id,
        uploadedBy: m.uploaded_by,
        createdAt: m.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
});

// Materials routes moved to materialsRoutes.js

// ============================================
// SYLLABUS — teacher-scoped CRUD
// ============================================

router.get('/syllabus', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const data = await getSyllabusByTeacher(pool, teacher.id);
    res.json({
      success: true, data: data.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        subject: s.subject,
        teacherId: s.teacher_id,
        classLevel: s.class_level,
        section: s.section,
        createdAt: s.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch syllabus' });
  }
});

router.post('/syllabus', async (req, res) => {
  try {
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeText(req.body.subject, 100);
    const chapter = sanitizeText(req.body.chapter, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    if (!classLevel || !subject || !chapter) return res.status(400).json({ success: false, error: 'Required fields missing' });

    // Verify teacher has permission for this class
    if (teacher.role !== 'admin') {
      const hasPermission = await checkTeacherClassPermission(pool, teacher.id, classLevel, section);
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'You do not have permission to update syllabus for this class' });
      }
    }

    const entry = await createSyllabusEntry(pool, { teacherId: teacher.id, classLevel, section, subject, chapter, description });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create syllabus entry' });
  }
});

router.put('/syllabus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, completed } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });
    const chapter = sanitizeNullableText(req.body.chapter, 200);
    const description = sanitizeNullableText(req.body.description, 5000);

    const own = await pool.query('SELECT teacher_id FROM syllabus WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ success: false, error: 'Entry not found' });
    if (own.rows[0].teacher_id !== teacher.id) return res.status(403).json({ success: false, error: 'Not authorized' });

    const updated = await updateSyllabusEntry(pool, id, { chapter, description, completed });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update syllabus entry' });
  }
});

router.delete('/syllabus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const own = await pool.query('SELECT teacher_id FROM syllabus WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ success: false, error: 'Entry not found' });
    if (own.rows[0].teacher_id !== teacher.id) return res.status(403).json({ success: false, error: 'Not authorized' });

    await deleteSyllabusEntry(pool, id);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete syllabus entry' });
  }
});

// ============================================
// EXAM RESULTS — teacher-scoped
// ============================================
router.post('/exam-results', createExamResult);
router.get('/exam-results', getExamResults);

// --- SUBJECTS ---
router.get('/subjects', async (req, res) => {
  try {
    const teacher = await requireTeacher(req);
    if (!teacher) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const { subjectModel } = await import('../subjects/subjectModel.js');
    const subjects = await subjectModel.getTeacherSubjects(teacher.id, req.db);
    res.json({ success: true, data: subjects });
  } catch (err) {
    console.error('Fetch teacher subjects error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

export default router;

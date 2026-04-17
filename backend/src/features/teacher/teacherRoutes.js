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

const uploadHomework  = multer({ storage: makeStorage('homework'),  fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadMaterial  = multer({ storage: makeStorage('materials'), fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// ============================================
// AUTH GUARD HELPER
// ============================================
async function requireTeacher(req, suppliedTeacherId = null) {
  const authenticatedTeacherId = parseInt(req.user?.userId, 10);
  const requestedTeacherId = suppliedTeacherId === null || suppliedTeacherId === undefined || suppliedTeacherId === ''
    ? authenticatedTeacherId
    : parseInt(suppliedTeacherId, 10);

  if (!authenticatedTeacherId || Number.isNaN(authenticatedTeacherId) || Number.isNaN(requestedTeacherId)) {
    return null;
  }

  if (authenticatedTeacherId !== requestedTeacherId) {
    return null;
  }

  const teacher = await getUserById(req.db, authenticatedTeacherId);
  return (teacher && teacher.role === 'teacher') ? teacher : null;
}

// ============================================
// HELPER — Parse Class & Section
// ============================================
function parseClassSection(input) {
  if (!input) return { classLevel: null, section: null };
  const match = input.match(/^(\d+)([A-Z])$/i);
  if (match) {
    return { classLevel: match[1], section: match[2] };
  }
  const matchNumeric = input.match(/^(\d+)$/);
  if (matchNumeric) return { classLevel: matchNumeric[1], section: null };
  return { classLevel: input, section: null };
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
    if (!teacher) return res.status(403).json({ error: 'Unauthorized: Not a teacher' });

    // 1. Get Assigned Classes from teacher_class_assignment table (snake_case)
    const assignRes = await pool.query(
      `SELECT DISTINCT class_level, section 
       FROM teacher_class_assignment 
       WHERE teacher_id = $1 
       ORDER BY class_level, section`,
      [parsedTeacherId]
    );
    let classes = assignRes.rows.map(r => (r.section && r.section !== 'ALL') ? `${r.class_level}${r.section}` : r.class_level);

    // 2. Fallback: If no assignments found, get from timetable (snake_case)
    if (classes.length === 0) {
      const ttRes = await pool.query(
        'SELECT DISTINCT class_level FROM timetable WHERE teacher_id = $1 ORDER BY class_level',
        [parsedTeacherId]
      );
      classes = ttRes.rows.map(r => r.class_level);
    }

    // 3. Get Timetable (snake_case)
    const ttRes = await pool.query(
      'SELECT * FROM timetable WHERE teacher_id = $1 ORDER BY day_of_week, start_time',
      [parsedTeacherId]
    );

    // 4. Get Homework & Student Count (snake_case)
    const [hwRes, studRes] = await Promise.all([
      pool.query(
        'SELECT * FROM homework WHERE teacher_id = $1 ORDER BY created_at DESC',
        [parsedTeacherId]
      ),
      assignRes.rows.length > 0 
        ? pool.query(
            `SELECT COUNT(id) AS total_students FROM students 
             WHERE id IN (
               SELECT s.id FROM students s
               JOIN teacher_class_assignment tca ON s.class_level = tca.class_level
               WHERE tca.teacher_id = $1 
               AND (tca.section IS NULL OR tca.section = 'ALL' OR tca.section = s.section)
             )`,
            [parsedTeacherId]
          )
        : (classes.length > 0 
            ? pool.query(
                `SELECT COUNT(id) AS total_students FROM students WHERE class_level = ANY($1)`,
                [classes]
              )
            : Promise.resolve({ rows: [{ total_students: 0 }] })
          )
    ]);

    res.json({
      success: true,
      teacher: { id: teacher.id, phone: teacher.phone, role: teacher.role },
      stats: {
        totalHomework: hwRes.rows.length,
        totalClasses: classes.length,
        totalStudents: parseInt(studRes.rows[0].total_students || 0),
      },
      classes: classes.map(c => ({ classLevel: c })),
      homework: hwRes.rows,
      timetable: ttRes.rows,
    });
  } catch (err) {
    console.error('❌ Teacher dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/teacher/timetable/:teacherId
router.get('/timetable/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const res2 = await pool.query(
      `SELECT * FROM timetable WHERE teacher_id = $1 ORDER BY day_of_week, start_time`,
      [teacher.id]
    );
    res.json({ success: true, data: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// GET /api/teacher/attendance/classes
router.get('/attendance/classes', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT DISTINCT class_level, section FROM teacher_class_assignment 
       WHERE teacher_id = $1 
       ORDER BY class_level, section`,
      [teacher.id]
    );

    let classes = result.rows.map(r => (r.section && r.section !== 'ALL') ? `${r.class_level}${r.section}` : r.class_level);
    if (classes.length === 0) {
      const ttResult = await pool.query(
        `SELECT DISTINCT class_level FROM timetable WHERE teacher_id = $1 ORDER BY class_level`,
        [teacher.id]
      );
      classes = ttResult.rows.map(r => r.class_level);
    }

    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/teacher/attendance/sheet
router.get('/attendance/sheet', async (req, res) => {
  try {
    const { teacherId, classLevel: classInput, date } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!classInput || !date) return res.status(400).json({ error: 'classLevel and date required' });

    const { classLevel, section } = parseClassSection(classInput);

    // Verify teacher assignment (snake_case)
    let assignmentCheck;
    if (section) {
        assignmentCheck = await pool.query(
            `SELECT id FROM teacher_class_assignment 
             WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL)`,
            [teacher.id, classLevel, section]
        );
    } else {
        assignmentCheck = await pool.query(
            `SELECT id FROM teacher_class_assignment 
             WHERE teacher_id = $1 AND class_level = $2`,
            [teacher.id, classLevel]
        );
    }

    if (assignmentCheck.rows.length === 0) {
      const timetableCheck = await pool.query(
        `SELECT id FROM timetable 
         WHERE teacher_id = $1 AND class_level = $2`,
        [teacher.id, classLevel]
      );
      if (timetableCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this class' });
      }
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
    res.status(500).json({ error: 'Failed to fetch sheet' });
  }
});

// POST /api/teacher/attendance/mark-bulk
router.post('/attendance/mark-bulk', async (req, res) => {
  try {
    const { teacherId, records } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ error: 'records array required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of records) {
        const isPresent = r.status === 'present';
        await client.query(
        `INSERT INTO attendance (student_id, user_id, class_level, date, is_present)
         VALUES ($1, (SELECT user_id FROM students WHERE id = $1), $2, $3, $4)
         ON CONFLICT (student_id, date)
         DO UPDATE SET is_present = EXCLUDED.is_present, class_level = EXCLUDED.class_level`,
        [r.studentId, r.classLevel, r.date, isPresent]
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
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

// GET /api/teacher/attendance/summary
router.get('/attendance/summary', async (req, res) => {
  try {
    const { teacherId, classLevel: classInput, month } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const { classLevel, section } = parseClassSection(classInput);

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
    res.json({ success: true, data: result.rows.map(r => ({
        name: r.name,
        studentId: r.student_id,
        presentCount: r.present_count,
        absentCount: r.absent_count,
        totalDays: r.total_days,
        attendancePercent: r.attendance_percent
    }))});
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to load summary' });
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
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const homework = await getHomeworkByTeacher(pool, teacher.id);
    res.json({ success: true, data: homework });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

router.post('/homework', uploadHomework.single('attachment'), async (req, res) => {
  try {
    const { teacherId, dueDate, type } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeNullableText(req.body.subject, 100);
    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    if (!classLevel || !title) return res.status(400).json({ error: 'classLevel and title required' });
    if (type !== 'daily_practice' && !dueDate) return res.status(400).json({ error: 'dueDate required' });

    const attachmentUrl = req.file ? `/uploads/homework/${req.file.filename}` : null;
    const finalDueDate = type === 'daily_practice' ? null : dueDate;
    const hw = await createHomework(pool, { teacherId: teacher.id, classLevel, section, subject, title, description, dueDate: finalDueDate, attachmentUrl, type });
    res.status(201).json({ success: true, data: hw });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

router.put('/homework/:id', uploadHomework.single('attachment'), async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, dueDate, type } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    const subject = sanitizeNullableText(req.body.subject, 100);

    const own = await pool.query('SELECT teacher_id FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Homework not found' });
    if (own.rows[0].teacher_id !== teacher.id) return res.status(403).json({ error: 'Not your homework' });

    const attachmentUrl = req.file ? `/uploads/homework/${req.file.filename}` : undefined;
    const finalDueDate = type === 'daily_practice' ? null : dueDate;
    const updated = await updateHomework(pool, id, { title, description, dueDate: finalDueDate, subject, attachmentUrl, type });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update homework' });
  }
});

router.delete('/homework/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT teacher_id FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Homework not found' });
    if (own.rows[0].teacher_id !== teacher.id) return res.status(403).json({ error: 'Not your homework' });

    await deleteHomework(pool, id);
    res.json({ success: true, message: 'Homework deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete homework' });
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
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT * FROM materials WHERE uploaded_by = $1 ORDER BY created_at DESC`,
      [teacher.phone]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.post('/materials', uploadMaterial.single('materialFile'), async (req, res) => {
  try {
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeText(req.body.subject, 100);
    if (!title || !classLevel || !subject) return res.status(400).json({ error: 'title, class_level, subject required' });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const fileUrl = `/uploads/materials/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO materials (title, description, class_level, section, subject, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || null, classLevel, section || null, subject, fileUrl, teacher.phone]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload material' });
  }
});

router.put('/materials/:id', uploadMaterial.single('materialFile'), async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeText(req.body.subject, 100);

    const own = await pool.query('SELECT uploaded_by FROM materials WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Material not found' });
    if (own.rows[0].uploaded_by !== teacher.phone) return res.status(403).json({ error: 'Not your material' });

    let fileUrl = req.body.currentFileUrl;
    if (req.file) fileUrl = `/uploads/materials/${req.file.filename}`;

    const result = await pool.query(
      `UPDATE materials SET title=$1, description=$2, class_level=$3, section=$4, subject=$5, file_url=$6 WHERE id=$7 RETURNING *`,
      [title, description || null, classLevel, section || null, subject, fileUrl, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update material' });
  }
});

router.delete('/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT uploaded_by FROM materials WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Material not found' });
    if (own.rows[0].uploaded_by !== teacher.phone) return res.status(403).json({ error: 'Not your material' });

    await pool.query('DELETE FROM materials WHERE id = $1', [id]);
    res.json({ success: true, message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// ============================================
// SYLLABUS — teacher-scoped CRUD
// ============================================

router.get('/syllabus', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const data = await getSyllabusByTeacher(pool, teacher.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch syllabus' });
  }
});

router.post('/syllabus', async (req, res) => {
  try {
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeText(req.body.subject, 100);
    const chapter = sanitizeText(req.body.chapter, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    if (!classLevel || !subject || !chapter) return res.status(400).json({ error: 'classLevel, subject and chapter required' });

    const entry = await createSyllabusEntry(pool, { teacherId: teacher.id, classLevel, section, subject, chapter, description });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create syllabus entry' });
  }
});

router.put('/syllabus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, completed } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    const chapter = sanitizeNullableText(req.body.chapter, 200);
    const description = sanitizeNullableText(req.body.description, 5000);

    const own = await pool.query('SELECT teacher_id FROM syllabus WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Entry not found' });
    if (own.rows[0].teacher_id !== teacher.id) return res.status(403).json({ error: 'Not your entry' });

    const updated = await updateSyllabusEntry(pool, id, { chapter, description, completed });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update syllabus entry' });
  }
});

router.delete('/syllabus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT teacher_id FROM syllabus WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Entry not found' });
    if (own.rows[0].teacher_id !== teacher.id) return res.status(403).json({ error: 'Not your entry' });

    await deleteSyllabusEntry(pool, id);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete syllabus entry' });
  }
});

// ============================================
// EXAM RESULTS — teacher-scoped
// ============================================

router.post('/exam-results', createExamResult);
router.get('/exam-results', getExamResults);

export default router;

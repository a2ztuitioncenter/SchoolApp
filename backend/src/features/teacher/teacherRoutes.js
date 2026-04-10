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
async function requireTeacher(pool, teacherId) {
  if (!teacherId || teacherId === 'null' || isNaN(parseInt(teacherId))) return null;
  const teacher = await getUserById(pool, parseInt(teacherId));
  return (teacher && teacher.role === 'teacher') ? teacher : null;
}

// ============================================
// DASHBOARD — enriched with timetable & stats
// ============================================
router.get('/dashboard/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const pool = req.db;
    const parsedTeacherId = parseInt(teacherId);

    console.log(`📊 Teacher Dashboard Request: teacherId=${teacherId} (parsed as ${parsedTeacherId})`);

    const teacher = await requireTeacher(pool, parsedTeacherId);
    if (!teacher) {
      console.warn(`⚠️ Unauthorized: TeacherId ${parsedTeacherId} is not a valid teacher`);
      return res.status(403).json({ error: 'Unauthorized: Not a teacher' });
    }

    console.log(`✅ Teacher verified: ${teacher.phone} (ID: ${teacher.id})`);

    // 1. Get Timetable (primary source of classes)
    const ttRes = await pool.query(
      'SELECT * FROM timetable WHERE "teacherId" = $1 ORDER BY "dayOfWeek", "startTime"',
      [parsedTeacherId]
    );
    console.log(`📅 Timetable entries found: ${ttRes.rows.length}`);
    if (ttRes.rows.length > 0) {
      console.log(`   Sample: ${JSON.stringify(ttRes.rows[0])}`);
    }

    // 2. Identify distinct classes this teacher covers
    const classes = [...new Set(ttRes.rows.map(r => r.classLevel))];

    // 3. Get Homework & Student Count based on those classes
    const [hwRes, studRes] = await Promise.all([
      pool.query(
        'SELECT * FROM homework WHERE "teacherId" = $1 ORDER BY "createdAt" DESC',
        [parsedTeacherId]
      ),
      pool.query(`SELECT COUNT(id) AS "totalStudents" FROM students`)
    ]);

    console.log(`📝 Homework entries: ${hwRes.rows.length}, Total Students: ${studRes.rows[0].totalStudents}`);

    res.json({
      success: true,
      teacher: { id: teacher.id, phone: teacher.phone, role: teacher.role },
      stats: {
        totalHomework: hwRes.rows.length,
        totalClasses: classes.length,
        totalStudents: parseInt(studRes.rows[0].totalStudents || 0),
      },
      classes: classes.map(c => ({ classLevel: c })),
      homework: hwRes.rows,
      timetable: ttRes.rows,
    });
  } catch (err) {
    console.error('❌ Teacher dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data', detail: err.message });
  }
});

// GET /api/teacher/timetable/:teacherId
router.get('/timetable/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const res2 = await pool.query(
      `SELECT * FROM timetable WHERE "teacherId" = $1 ORDER BY "dayOfWeek", "startTime"`,
      [teacherId]
    );
    res.json({ success: true, data: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timetable', detail: err.message });
  }
});

// ============================================
// ATTENDANCE — teacher-scoped
// ============================================

// GET /api/teacher/attendance/classes?teacherId=X
router.get('/attendance/classes', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT DISTINCT "classLevel" FROM students WHERE "classLevel" IS NOT NULL ORDER BY "classLevel"`
    );
    res.json({ success: true, data: result.rows.map(r => r.classLevel) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes', detail: err.message });
  }
});

// GET /api/teacher/attendance/sheet?teacherId=X&classLevel=10&date=2026-03-30
router.get('/attendance/sheet', async (req, res) => {
  try {
    const { teacherId, classLevel, date } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!classLevel || !date) return res.status(400).json({ error: 'classLevel and date required' });

    const [students, existing] = await Promise.all([
      pool.query(
        `SELECT s.id, s.name, s."rollNumber" FROM students s WHERE s."classLevel" = $1 ORDER BY s.name`,
        [classLevel]
      ),
      pool.query(
        `SELECT a."studentId", a.status FROM attendance a
         JOIN students s ON a."studentId" = s.id
         WHERE s."classLevel" = $1 AND a.date = $2`,
        [classLevel, date]
      ),
    ]);

    const attMap = {};
    existing.rows.forEach(a => { attMap[a.studentId] = a.status; });

    res.json({
      success: true,
      students: students.rows,
      existing: attMap,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sheet', detail: err.message });
  }
});

// POST /api/teacher/attendance/mark-bulk
router.post('/attendance/mark-bulk', async (req, res) => {
  try {
    const { teacherId, records } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ error: 'records array required' });

    for (const r of records) {
      await pool.query(
        `INSERT INTO attendance ("studentId", "classLevel", date, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("studentId", date)
         DO UPDATE SET status = EXCLUDED.status, "classLevel" = EXCLUDED."classLevel"`,
        [r.studentId, r.classLevel, r.date, r.status]
      );
    }
    res.json({ success: true, message: `Saved ${records.length} attendance records` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save attendance', detail: err.message });
  }
});

// GET /api/teacher/attendance/summary?teacherId=X&classLevel=10&month=2026-03
router.get('/attendance/summary', async (req, res) => {
  try {
    const { teacherId, classLevel, month } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT s.name, s.id AS "studentId",
         COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS "presentCount",
         COUNT(CASE WHEN a.status = 'absent'  THEN 1 END) AS "absentCount",
         COUNT(CASE WHEN a.status = 'late'    THEN 1 END) AS "lateCount",
         COUNT(a.id) AS "totalDays",
         ROUND(
           COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1
         ) AS "attendancePercent"
       FROM students s
       LEFT JOIN attendance a ON a."studentId" = s.id AND TO_CHAR(a.date, 'YYYY-MM') = $2
       WHERE s."classLevel" = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [classLevel, month]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load summary', detail: err.message });
  }
});

// ============================================
// HOMEWORK — teacher-scoped CRUD with upload
// ============================================

// GET /api/teacher/homework?teacherId=X
router.get('/homework', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const homework = await getHomeworkByTeacher(pool, teacherId);
    res.json({ success: true, data: homework });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch homework', detail: err.message });
  }
});

// POST /api/teacher/homework  (multipart)
router.post('/homework', uploadHomework.single('attachment'), async (req, res) => {
  try {
    const { teacherId, classLevel, section, subject, title, description, dueDate, type } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!classLevel || !title) return res.status(400).json({ error: 'classLevel and title required' });
    if (type !== 'daily_practice' && !dueDate) return res.status(400).json({ error: 'dueDate required' });

    const attachmentUrl = req.file ? `/uploads/homework/${req.file.filename}` : null;
    const finalDueDate = type === 'daily_practice' ? null : dueDate;
    const hw = await createHomework(pool, { teacherId, classLevel, section, subject, title, description, dueDate: finalDueDate, attachmentUrl, type });
    res.status(201).json({ success: true, data: hw });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create homework', detail: err.message });
  }
});

// PUT /api/teacher/homework/:id  (multipart)
router.put('/homework/:id', uploadHomework.single('attachment'), async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, title, description, dueDate, subject, type } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT "teacherId" FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Homework not found' });
    if (own.rows[0].teacherId !== parseInt(teacherId)) return res.status(403).json({ error: 'Not your homework' });

    const attachmentUrl = req.file ? `/uploads/homework/${req.file.filename}` : undefined;
    const finalDueDate = type === 'daily_practice' ? null : dueDate;
    const updated = await updateHomework(pool, id, { title, description, dueDate: finalDueDate, subject, attachmentUrl, type });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update homework', detail: err.message });
  }
});

// DELETE /api/teacher/homework/:id
router.delete('/homework/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT "teacherId" FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Homework not found' });
    if (own.rows[0].teacherId !== parseInt(teacherId)) return res.status(403).json({ error: 'Not your homework' });

    await deleteHomework(pool, id);
    res.json({ success: true, message: 'Homework deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete homework', detail: err.message });
  }
});

// ============================================
// STUDY MATERIALS — teacher-scoped CRUD
// ============================================

// GET /api/teacher/materials?teacherId=X
router.get('/materials', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT * FROM materials WHERE "uploadedBy" = $1 ORDER BY "createdAt" DESC`,
      [teacher.phone]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials', detail: err.message });
  }
});

// POST /api/teacher/materials  (multipart)
router.post('/materials', uploadMaterial.single('materialFile'), async (req, res) => {
  try {
    const { teacherId, title, description, classLevel, section, subject } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!title || !classLevel || !subject) return res.status(400).json({ error: 'title, classLevel, subject required' });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const fileUrl = `/uploads/materials/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO materials (title, description, "classLevel", section, subject, "fileUrl", "uploadedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || null, classLevel, section || null, subject, fileUrl, teacher.phone]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload material', detail: err.message });
  }
});

// PUT /api/teacher/materials/:id  (multipart)
router.put('/materials/:id', uploadMaterial.single('materialFile'), async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, title, description, classLevel, section, subject } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT "uploadedBy" FROM materials WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Material not found' });
    if (own.rows[0].uploadedBy !== teacher.phone) return res.status(403).json({ error: 'Not your material' });

    let fileUrl = req.body.currentFileUrl;
    if (req.file) fileUrl = `/uploads/materials/${req.file.filename}`;

    const result = await pool.query(
      `UPDATE materials SET title=$1, description=$2, "classLevel"=$3, section=$4, subject=$5, "fileUrl"=$6 WHERE id=$7 RETURNING *`,
      [title, description || null, classLevel, section || null, subject, fileUrl, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update material', detail: err.message });
  }
});

// DELETE /api/teacher/materials/:id
router.delete('/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT "uploadedBy" FROM materials WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Material not found' });
    if (own.rows[0].uploadedBy !== teacher.phone) return res.status(403).json({ error: 'Not your material' });

    await pool.query('DELETE FROM materials WHERE id = $1', [id]);
    res.json({ success: true, message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material', detail: err.message });
  }
});

// ============================================
// SYLLABUS — teacher-scoped CRUD
// ============================================

// GET /api/teacher/syllabus?teacherId=X
router.get('/syllabus', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const data = await getSyllabusByTeacher(pool, teacherId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch syllabus', detail: err.message });
  }
});

// POST /api/teacher/syllabus
router.post('/syllabus', async (req, res) => {
  try {
    const { teacherId, classLevel, section, subject, chapter, description } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!classLevel || !subject || !chapter) return res.status(400).json({ error: 'classLevel, subject and chapter required' });

    const entry = await createSyllabusEntry(pool, { teacherId, classLevel, section, subject, chapter, description });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create syllabus entry', detail: err.message });
  }
});

// PUT /api/teacher/syllabus/:id
router.put('/syllabus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, chapter, description, completed } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT "teacherId" FROM syllabus WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Entry not found' });
    if (own.rows[0].teacherId !== parseInt(teacherId)) return res.status(403).json({ error: 'Not your entry' });

    const updated = await updateSyllabusEntry(pool, id, { chapter, description, completed });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update syllabus entry', detail: err.message });
  }
});

// DELETE /api/teacher/syllabus/:id
router.delete('/syllabus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;
    const teacher = await requireTeacher(pool, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const own = await pool.query('SELECT "teacherId" FROM syllabus WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Entry not found' });
    if (own.rows[0].teacherId !== parseInt(teacherId)) return res.status(403).json({ error: 'Not your entry' });

    await deleteSyllabusEntry(pool, id);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete syllabus entry', detail: err.message });
  }
});

// ============================================
// EXAM RESULTS — teacher-scoped
// ============================================

// POST /api/teacher/exam-results
router.post('/exam-results', createExamResult);

// GET /api/teacher/exam-results
router.get('/exam-results', getExamResults);

export default router;

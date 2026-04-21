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

// Check if teacher is assigned to teach a class
async function checkTeacherClassPermission(pool, teacherId, classLevel, section) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE "teacherId" = $1 AND "classLevel" = $2 AND (section = $3 OR section = 'ALL')`,
      [teacherId, classLevel, section || 'A']
    );
    return result.rows[0].count > 0;
  } catch (err) {
    console.error('Error checking class permission:', err);
    return false;
  }
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
      `SELECT DISTINCT "classLevel", section 
       FROM teacher_class_assignment 
       WHERE "teacherId" = $1 
       ORDER BY "classLevel", section`,
      [parsedTeacherId]
    );
    let classes = assignRes.rows.map(r => (r.section && r.section !== 'ALL') ? `${r.classLevel}${r.section}` : r.classLevel);

    // 2. Fallback: If no assignments found, get from timetable (snake_case)
    if (classes.length === 0) {
      const ttRes = await pool.query(
        'SELECT DISTINCT "classLevel" FROM timetable WHERE "teacherId" = $1 ORDER BY "classLevel"',
        [parsedTeacherId]
      );
      classes = ttRes.rows.map(r => r.classLevel);
    }

    // 3. Get Timetable (snake_case)
    const ttRes = await pool.query(
      'SELECT * FROM timetable WHERE "teacherId" = $1 ORDER BY "dayOfWeek", "startTime"',
      [parsedTeacherId]
    );

    // 4. Get Homework & Student Count (camelCase)
    const [hwRes, studRes] = await Promise.all([
      pool.query(
        'SELECT * FROM homework WHERE "teacherId" = $1 ORDER BY "createdAt" DESC',
        [parsedTeacherId]
      ),
      assignRes.rows.length > 0
        ? pool.query(
          `SELECT COUNT(id) AS total_students FROM students 
             WHERE id IN (
               SELECT s.id FROM students s
               JOIN teacher_class_assignment tca ON s."classLevel" = tca."classLevel"
               WHERE tca."teacherId" = $1 
               AND (tca.section IS NULL OR tca.section = 'ALL' OR tca.section = s.section)
             )`,
          [parsedTeacherId]
        )
        : (classes.length > 0
          ? pool.query(
            `SELECT COUNT(id) AS total_students FROM students WHERE "classLevel" = ANY($1)`,
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
      `SELECT * FROM timetable WHERE "teacherId" = $1 ORDER BY "dayOfWeek", "startTime"`,
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
      `SELECT DISTINCT "classLevel", section FROM teacher_class_assignment 
       WHERE "teacherId" = $1 
       ORDER BY "classLevel", section`,
      [teacher.id]
    );

    let classes = result.rows.map(r => (r.section && r.section !== 'ALL') ? `${r.classLevel}${r.section}` : r.classLevel);
    if (classes.length === 0) {
      const ttResult = await pool.query(
        `SELECT DISTINCT "classLevel" FROM timetable WHERE "teacherId" = $1 ORDER BY "classLevel"`,
        [teacher.id]
      );
      classes = ttResult.rows.map(r => r.classLevel);
    }

    res.json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/teacher/attendance/sections
router.get('/attendance/sections', async (req, res) => {
  try {
    const { teacherId, classLevel } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!classLevel) return res.status(400).json({ error: 'classLevel required' });

    const result = await pool.query(
      `SELECT DISTINCT section FROM students 
       WHERE "classLevel" = $1 AND section IS NOT NULL 
       ORDER BY section`,
      [sanitizeIdentifier(classLevel)]
    );

    const sections = result.rows.map(r => r.section);
    res.json({ success: true, data: sections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// GET /api/teacher/attendance/sheet
router.get('/attendance/sheet', async (req, res) => {
  try {
    const { teacherId, classLevel: classInput, date, section: querySection } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });
    if (!classInput || !date) return res.status(400).json({ error: 'classLevel and date required' });

    const parsed = parseClassSection(classInput);
    const classLevel = parsed.classLevel;
    const section = querySection || parsed.section;

    // Verify teacher assignment (snake_case)
    let assignmentCheck;
    if (section) {
      assignmentCheck = await pool.query(
        `SELECT id FROM teacher_class_assignment 
             WHERE "teacherId" = $1 AND "classLevel" = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL)`,
        [teacher.id, classLevel, section]
      );
    } else {
      assignmentCheck = await pool.query(
        `SELECT id FROM teacher_class_assignment 
             WHERE "teacherId" = $1 AND "classLevel" = $2`,
        [teacher.id, classLevel]
      );
    }

    if (assignmentCheck.rows.length === 0) {
      const timetableCheck = await pool.query(
        `SELECT id FROM timetable 
         WHERE "teacherId" = $1 AND "classLevel" = $2`,
        [teacher.id, classLevel]
      );
      if (timetableCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this class' });
      }
    }

    let studentsQuery = `SELECT id, name, "rollNumber" FROM students WHERE "classLevel" = $1`;
    let studentsParams = [classLevel];
    if (section) {
      studentsQuery += ` AND section = $2`;
      studentsParams.push(section);
    }
    studentsQuery += ` ORDER BY name`;

    let existingQuery = `SELECT a."studentId", a."isPresent" FROM attendance a
                        JOIN students s ON a."studentId" = s.id
                        WHERE s."classLevel" = $1`;
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
    existing.rows.forEach(a => { attMap[a.studentId] = a.isPresent ? 'present' : 'absent'; });

    res.json({
      success: true,
      students: students.rows.map(s => ({ id: s.id, name: s.name, rollNumber: s.rollNumber })),
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
          `INSERT INTO attendance ("studentId", "userId", "classLevel", date, "isPresent")
         VALUES ($1, (SELECT "userId" FROM students WHERE id = $1), $2, $3, $4)
         ON CONFLICT ("studentId", date)
         DO UPDATE SET "isPresent" = EXCLUDED."isPresent", "classLevel" = EXCLUDED."classLevel"`,
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
    const { teacherId, classLevel: classInput, month, section: querySection } = req.query;
    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);
    if (!teacher) return res.status(403).json({ error: 'Unauthorized' });

    const parsed = parseClassSection(classInput);
    const classLevel = parsed.classLevel;
    const section = querySection || parsed.section;

    let query = `SELECT s.name, s.id AS student_id,
          COUNT(CASE WHEN a."isPresent" = true THEN 1 END) AS present_count,
          COUNT(CASE WHEN a."isPresent" = false THEN 1 END) AS absent_count,
          COUNT(a.id) AS total_days,
          ROUND(
            COUNT(CASE WHEN a."isPresent" = true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1
          ) AS attendance_percent
        FROM students s
        LEFT JOIN attendance a ON a."studentId" = s.id AND TO_CHAR(a.date, 'YYYY-MM') = $${section ? 3 : 2}
        WHERE s."classLevel" = $1`;

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

    const own = await pool.query('SELECT "teacherId", "classLevel", section FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Homework not found' });

    // Check if teacher can edit: either they created it OR it's assigned to their class
    const homework = own.rows[0];
    const canEdit = homework.teacherId === teacher.id ||
      await checkTeacherClassPermission(pool, teacher.id, homework.classLevel, homework.section);

    if (!canEdit) return res.status(403).json({ error: 'Not authorized to edit this homework' });

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

    const own = await pool.query('SELECT teacher_id, class_level, section FROM homework WHERE id = $1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Homework not found' });

    // Check if teacher can delete: either they created it OR it's assigned to their class
    const homework = own.rows[0];
    const canDelete = homework.teacher_id === teacher.id ||
      await checkTeacherClassPermission(pool, teacher.id, homework.class_level, homework.section);

    if (!canDelete) return res.status(403).json({ error: 'Not authorized to delete this homework' });

    await deleteHomework(pool, id);
    res.json({ success: true, message: 'Homework deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

// ============================================
// STUDY MATERIALS — teacher-scoped CRUD with authorization
// ============================================

router.get('/materials', async (req, res) => {
  try {
    const { teacherId } = req.query;
    console.log('🔍 [GET /teacher/materials] Request received - teacherId:', teacherId);

    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);

    if (!teacher) {
      console.log('❌ [GET /teacher/materials] Authorization failed for teacherId:', teacherId);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get materials uploaded by this teacher
    const result = await pool.query(
      `SELECT * FROM materials 
       WHERE uploaded_by_id = $1 
       ORDER BY created_at DESC`,
      [teacher.id]
    );

    console.log(`✅ [GET /teacher/materials] Returned ${result.rows.length} materials for teacher ID ${teacher.id}`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching materials:', err);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.post('/materials', uploadMaterial.single('materialFile'), async (req, res) => {
  try {
    const { teacherId } = req.body;
    console.log('📝 [POST /teacher/materials] Upload request - teacherId:', teacherId, 'file:', req.file?.filename || 'NONE');

    const pool = req.db;
    const teacher = await requireTeacher(req, teacherId);

    if (!teacher) {
      console.log('❌ [POST /teacher/materials] Authorization failed for teacherId:', teacherId);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10) || null; // Allow section to be NULL for shared materials
    const subject = sanitizeText(req.body.subject, 100);

    console.log('📝 [POST /teacher/materials] Parsed fields:', { title, classLevel, section: section || 'SHARED', subject });

    // Section is optional - NULL allows sharing across all sections
    if (!title || !classLevel || !subject) {
      console.log('❌ [POST /teacher/materials] Missing required fields');
      return res.status(400).json({ error: 'All fields required: title, classLevel, subject. Section is optional (leave empty for shared materials).' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Validate teacher has permission for this class (section-specific or class-wide)
    let permissionQuery;
    let permissionParams;

    if (section) {
      // For section-specific materials, check section assignment
      permissionQuery = `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE "teacherId" = $1 AND "classLevel" = $2 AND (section = $3 OR section = 'ALL')`;
      permissionParams = [teacher.id, classLevel, section];
    } else {
      // For shared materials (section = NULL), just check class assignment
      permissionQuery = `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE "teacherId" = $1 AND "classLevel" = $2`;
      permissionParams = [teacher.id, classLevel];
    }

    const permissionCheck = await pool.query(permissionQuery, permissionParams);

    if (permissionCheck.rows[0].count === 0) {
      return res.status(403).json({
        error: 'You do not have permission to upload materials for this class. Please ensure it is assigned to you.'
      });
    }

    const fileUrl = `/uploads/materials/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO materials (title, description, class_level, section, subject, file_url, uploaded_by_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description || null, classLevel, section || null, subject, fileUrl, teacher.id, teacher.phone]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error uploading material:', err);
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
    const section = sanitizeNullableText(req.body.section, 10) || null; // Allow section to be NULL for shared materials
    const subject = sanitizeText(req.body.subject, 100);

    // Section is optional - NULL allows sharing across all sections

    // Check if material exists and belongs to this teacher
    const own = await pool.query(
      'SELECT uploaded_by_id FROM materials WHERE id = $1',
      [id]
    );
    if (!own.rows.length) {
      return res.status(404).json({ error: 'Material not found' });
    }
    if (own.rows[0].uploaded_by_id !== teacher.id) {
      return res.status(403).json({ error: 'You can only modify materials you uploaded' });
    }

    // Validate teacher has permission for this class (section-specific or class-wide)
    let permissionQuery;
    let permissionParams;

    if (section) {
      // For section-specific materials, check section assignment
      permissionQuery = `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE "teacherId" = $1 AND "classLevel" = $2 AND (section = $3 OR section = 'ALL')`;
      permissionParams = [teacher.id, classLevel, section];
    } else {
      // For shared materials (section = NULL), just check class assignment
      permissionQuery = `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE "teacherId" = $1 AND "classLevel" = $2`;
      permissionParams = [teacher.id, classLevel];
    }

    const permissionCheck = await pool.query(permissionQuery, permissionParams);

    if (permissionCheck.rows[0].count === 0) {
      return res.status(403).json({
        error: 'You do not have permission to upload materials for this class. Please ensure it is assigned to you.'
      });
    }

    let fileUrl = req.body.currentFileUrl;
    if (req.file) fileUrl = `/uploads/materials/${req.file.filename}`;

    const result = await pool.query(
      `UPDATE materials 
       SET title=$1, description=$2, class_level=$3, section=$4, subject=$5, file_url=$6, uploaded_by=$7 
       WHERE id=$8 RETURNING *`,
      [title, description || null, classLevel, section || null, subject, fileUrl, teacher.phone, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating material:', err);
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

    // Check if material exists and belongs to this teacher
    const own = await pool.query(
      'SELECT uploaded_by_id FROM materials WHERE id = $1',
      [id]
    );
    if (!own.rows.length) {
      return res.status(404).json({ error: 'Material not found' });
    }
    if (own.rows[0].uploaded_by_id !== teacher.id) {
      return res.status(403).json({ error: 'You can only delete materials you uploaded' });
    }

    await pool.query('DELETE FROM materials WHERE id = $1', [id]);
    res.json({ success: true, message: 'Material deleted' });
  } catch (err) {
    console.error('Error deleting material:', err);
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

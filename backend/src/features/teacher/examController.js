import { sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

const checkTeacherClassPermission = async (db, teacherId, classLevel, section) => {
  try {
    // Check new subject_assignments table first
    const subjectRes = await db.query(
      `SELECT COUNT(*) as count FROM subject_assignments 
       WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL OR $3 IS NULL OR $3 = 'ALL')`,
      [teacherId, classLevel, section]
    );
    if (parseInt(subjectRes.rows[0].count, 10) > 0) return true;

    // Fallback to legacy teacher_class_assignment
    const result = await db.query(
      `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL OR $3 IS NULL OR $3 = 'ALL')`,
      [teacherId, classLevel, section]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (err) {
    console.error('Error checking class permission:', err);
    return false;
  }
};

export const createExamResult = async (req, res) => {
  const classLevel = sanitizeText(req.body.classLevel || req.body.class_level, 20);
  const section = sanitizeNullableText(req.body.section, 10) || 'A';
  const rollNumber = sanitizeNullableText(req.body.rollNumber || req.body.roll_number, 20);
  const studentName = sanitizeText(req.body.studentName || req.body.student_name, 100);
  const examTitle = sanitizeText(req.body.examTitle || req.body.exam_title, 200);
  const subjects = Array.isArray(req.body.subjects)
    ? req.body.subjects.map((subject) => ({
      name: sanitizeText(subject.name, 100),
      total: Number(subject.total) || 0,
      obtained: Number(subject.obtained) || 0,
      grade: sanitizeNullableText(subject.grade, 10)
    }))
    : null;
  const totalMarks = Number(req.body.totalMarks || req.body.total_marks) || 0;
  const obtainedMarks = Number(req.body.obtainedMarks || req.body.obtained_marks) || 0;
  const percentage = Number(req.body.percentage) || 0;
  const remarks = sanitizeNullableText(req.body.remarks, 500);
  const rawStudentId = req.body.studentId || req.body.student_id;
  const studentId = rawStudentId ? Number(rawStudentId) : null;
  const teacherId = req.user.userId;
  const pool = req.db;

  try {
    if (!classLevel || !studentName || !examTitle || !subjects) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Role-based security checks
    const role = req.user?.role?.toLowerCase() || '';
    if (role === 'student') {
      return res.status(403).json({ success: false, error: 'Forbidden: Students are not authorized to create exam results' });
    }

    // Teachers/staff must have permission to teach the submitted class and section
    if (role === 'teacher' || role === 'staff') {
      const hasPermission = await checkTeacherClassPermission(pool, teacherId, classLevel, section);
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission for this class and section' });
      }
    }

    // Verify student exists, belongs to the correct class level/section, and is in the same school
    if (studentId) {
      const studentCheck = await pool.query(
        `SELECT class_level, section, school_id FROM students WHERE id = $1`,
        [studentId]
      );
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }
      const student = studentCheck.rows[0];
      if (student.school_id !== req.user.schoolId) {
        return res.status(403).json({ success: false, error: 'Forbidden: School boundary mismatch' });
      }
      
      const dbClassLevel = String(student.class_level).trim().toLowerCase();
      const inputClassLevel = String(classLevel).trim().toLowerCase();
      const dbSection = String(student.section || 'A').trim().toLowerCase();
      const inputSection = String(section || 'A').trim().toLowerCase();
      
      if (dbClassLevel !== inputClassLevel || dbSection !== inputSection) {
        return res.status(400).json({ success: false, error: 'Student class/section mismatch' });
      }
    }

    const result = await pool.query(
      `INSERT INTO exam_results 
       (class_level, section, roll_number, student_name, exam_title, subjects, total_marks, obtained_marks, percentage, remarks, teacher_id, student_id, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [classLevel, section, rollNumber, studentName, examTitle, JSON.stringify(subjects), totalMarks, obtainedMarks, percentage, remarks, teacherId, studentId, req.user.schoolId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating exam result:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getExamResults = async (req, res) => {
  const teacherId = req.user.userId;
  const pool = req.db;

  try {
    const results = await pool.query(
      `SELECT er.*, COALESCE(s.roll_number, er.roll_number) as roll_no
       FROM exam_results er
       LEFT JOIN students s ON er.student_id = s.id
       WHERE er.teacher_id = $1 AND er.school_id = $2
       ORDER BY er.created_at DESC`,
      [teacherId, req.user.schoolId]
    );

    const mappedResults = results.rows.map(r => ({
      id: r.id,
      classLevel: r.class_level,
      section: r.section,
      rollNumber: r.roll_no || r.roll_number,
      roll_no: r.roll_no || r.roll_number,
      studentName: r.student_name,
      examTitle: r.exam_title,
      subjects: r.subjects,
      totalMarks: r.total_marks,
      obtainedMarks: r.obtained_marks,
      percentage: r.percentage,
      remarks: r.remarks,
      teacherId: r.teacher_id,
      studentId: r.student_id,
      createdAt: r.created_at
    }));

    res.json({ success: true, data: mappedResults });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

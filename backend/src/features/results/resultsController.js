import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getResultsByStudent = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { student } = req.params;

    if (!schoolId) {
      console.warn('[getResultsByStudent] Missing schoolId in request');
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing school isolation key' });
    }

    let result;
    if (student === 'all') {
      result = await req.db.query(
        `SELECT er.*, s.roll_number as roll_no
         FROM exam_results er
         LEFT JOIN students s ON er.student_id = s.id
         WHERE er.school_id = $1
         ORDER BY er.created_at DESC`,
        [schoolId]
      );
    } else {
      // Filter by roll number or student name
      result = await req.db.query(
        `SELECT er.*, s.roll_number as roll_no
         FROM exam_results er
         LEFT JOIN students s ON er.student_id = s.id
         WHERE (er.roll_number = $1 OR er.student_name = $1) AND er.school_id = $2
         ORDER BY er.created_at DESC`,
        [student, schoolId]
      );
    }

    if (!result || !result.rows) {
      return res.json({ success: true, data: [] });
    }

    const mappedData = result.rows.map(r => ({
      id: r.id,
      classLevel: r.class_level,
      section: r.section,
      rollNumber: r.roll_no || r.roll_number,
      studentName: r.student_name,
      examTitle: r.exam_title,
      subjects: typeof r.subjects === 'string' ? JSON.parse(r.subjects) : r.subjects,
      totalMarks: r.total_marks,
      obtainedMarks: r.obtained_marks,
      percentage: r.percentage,
      remarks: r.remarks,
      teacherId: r.teacher_id,
      studentId: r.student_id,
      createdAt: r.created_at
    }));

    res.json({ success: true, data: mappedData });
  } catch (err) {
    console.error('[getResultsByStudent] Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const createResult = async (req, res) => {
  try {
    const classLevel = sanitizeText(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10) || 'A';
    const rollNumber = sanitizeText(req.body.rollNumber || req.body.roll_number, 20);
    const studentName = sanitizeText(req.body.studentName || req.body.student_name, 1000);
    const examTitle = sanitizeText(req.body.examTitle || req.body.exam_title, 200);
    const totalMarks = Number(req.body.totalMarks || req.body.total_marks) || 0;
    const obtainedMarks = Number(req.body.obtainedMarks || req.body.obtained_marks) || 0;
    const remarks = sanitizeNullableText(req.body.remarks, 500);
    const studentId = Number(req.body.studentId || req.body.student_id);
    const teacherId = sanitizeIdentifier(String(req.user?.userId || req.body.teacherId || req.body.teacher_id), 20);
    const schoolId = req.user.schoolId;

    if (!classLevel || !studentName || !examTitle)
      return res.status(400).json({ success: false, error: 'classLevel, studentName, and examTitle are required' });

    const subjects = req.body.subjects || {};

    const result = await req.db.query(
      `INSERT INTO exam_results (class_level, section, roll_number, student_name, exam_title, subjects, total_marks, obtained_marks, percentage, remarks, teacher_id, student_id, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [classLevel, section, rollNumber, studentName, examTitle, JSON.stringify(subjects), totalMarks, obtainedMarks, (obtainedMarks / totalMarks * 100) || 0, remarks, teacherId, studentId, schoolId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('createResult:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

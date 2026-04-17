import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getResultsByStudent = async (req, res) => {
  try {
    const { student } = req.params;
    let result;
    if (student === 'all') {
      result = await req.db.query(
        `SELECT * FROM exam_results ORDER BY created_at DESC`
      );
    } else {
      // Filter by roll number or student name since those are the primary identifiers in exam_results
      result = await req.db.query(
        `SELECT * FROM exam_results 
         WHERE roll_number = $1 OR student_name = $1 
         ORDER BY created_at DESC`,
        [student]
      );
    }
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getResultsByStudent:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createResult = async (req, res) => {
  try {
    const classLevel = sanitizeText(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10) || 'A';
    const rollNumber = sanitizeText(req.body.rollNumber || req.body.roll_number, 20);
    const studentName = sanitizeText(req.body.studentName || req.body.student_name, 100);
    const examTitle = sanitizeText(req.body.examTitle || req.body.exam_title, 200);
    const totalMarks = Number(req.body.totalMarks || req.body.total_marks) || 0;
    const obtainedMarks = Number(req.body.obtainedMarks || req.body.obtained_marks) || 0;
    const remarks = sanitizeNullableText(req.body.remarks, 500);
    const teacherId = sanitizeIdentifier(req.user?.userId || req.body.teacherId || req.body.teacher_id, 20);

    if (!classLevel || !studentName || !examTitle)
      return res.status(400).json({ error: 'classLevel, studentName, and examTitle are required' });

    const subjects = req.body.subjects || {};

    const result = await req.db.query(
      `INSERT INTO exam_results (class_level, section, roll_number, student_name, exam_title, subjects, total_marks, obtained_marks, percentage, remarks, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [classLevel, section, rollNumber, studentName, examTitle, JSON.stringify(subjects), totalMarks, obtainedMarks, (obtainedMarks / totalMarks * 100) || 0, remarks, teacherId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('createResult:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

import { sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const createExamResult = async (req, res) => {
  const classLevel = sanitizeText(req.body.classLevel || req.body.class_level, 20);
  const section = sanitizeNullableText(req.body.section, 10);
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
  const teacherId = req.user.userId;
  const pool = req.db;

  try {
    if (!classLevel || !studentName || !examTitle || !subjects) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO exam_results 
       (class_level, section, roll_number, student_name, exam_title, subjects, total_marks, obtained_marks, percentage, remarks, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [classLevel, section, rollNumber, studentName, examTitle, JSON.stringify(subjects), totalMarks, obtainedMarks, percentage, remarks, teacherId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating exam result:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getExamResults = async (req, res) => {
  const teacherId = req.user.userId;
  const pool = req.db;

  try {
    const results = await pool.query(
      `SELECT id, class_level as "classLevel", section, roll_number as "rollNumber", 
              student_name as "studentName", exam_title as "examTitle", subjects, 
              total_marks as "totalMarks", obtained_marks as "obtainedMarks", 
              percentage, remarks, teacher_id as "teacherId", created_at as "createdAt"
       FROM exam_results 
       WHERE teacher_id = $1 
       ORDER BY created_at DESC`,
      [teacherId]
    );
    res.json({ success: true, data: results.rows });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

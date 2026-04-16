import { sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const createExamResult = async (req, res) => {
  const classLevel = sanitizeText(req.body.classLevel, 20);
  const section = sanitizeNullableText(req.body.section, 10);
  const rollNumber = sanitizeNullableText(req.body.rollNumber, 20);
  const studentName = sanitizeText(req.body.studentName, 100);
  const examTitle = sanitizeText(req.body.examTitle, 200);
  const subjects = Array.isArray(req.body.subjects)
    ? req.body.subjects.map((subject) => ({
        name: sanitizeText(subject.name, 100),
        total: Number(subject.total) || 0,
        obtained: Number(subject.obtained) || 0,
        grade: sanitizeNullableText(subject.grade, 10)
      }))
    : null;
  const totalMarks = Number(req.body.totalMarks) || 0;
  const obtainedMarks = Number(req.body.obtainedMarks) || 0;
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
       ("classLevel", section, "rollNumber", "studentName", "examTitle", subjects, "totalMarks", "obtainedMarks", percentage, remarks, "teacherId")
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
      'SELECT * FROM exam_results WHERE "teacherId" = $1 ORDER BY "createdAt" DESC',
      [teacherId]
    );
    res.json({ success: true, data: results.rows });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

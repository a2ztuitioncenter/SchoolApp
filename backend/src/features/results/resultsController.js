import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getResultsByStudent = async (req, res) => {
  try {
    const { student } = req.params;
    let result;
    if (student === 'all') {
      // Join to get student name
      result = await req.db.query(
        `SELECT r.*, s.name AS "studentName"
         FROM results r
         LEFT JOIN students s ON r."studentId" = s.id
         ORDER BY r."createdAt" DESC`
      );
    } else {
      result = await req.db.query(
        `SELECT r.*, s.name AS "studentName"
         FROM results r
         LEFT JOIN students s ON r."studentId" = s.id
         WHERE r."studentId" = $1
         ORDER BY r."createdAt" DESC`,
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
    const studentId = sanitizeIdentifier(req.body.studentId, 20);
    const examTitle = sanitizeText(req.body.examTitle, 200);
    const subject = sanitizeText(req.body.subject, 100);
    const marksObtained = req.body.marksObtained;
    const totalMarks = req.body.totalMarks;
    const remarks = sanitizeNullableText(req.body.remarks, 5000);
    const recordedBy = sanitizeIdentifier(req.user?.userId || req.body.recordedBy, 20);
    if (!studentId || !examTitle || !subject || !marksObtained || !totalMarks)
      return res.status(400).json({ error: 'studentId, examTitle, subject, marksObtained, totalMarks required' });
    const result = await req.db.query(
      `INSERT INTO results ("studentId", exam_title, subject, marks_obtained, total_marks, remarks, "recordedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [studentId, examTitle, subject, marksObtained, totalMarks, remarks || null, recordedBy || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('createResult:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

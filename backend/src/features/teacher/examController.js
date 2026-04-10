export const createExamResult = async (req, res) => {
  const { classLevel, section, rollNumber, studentName, examTitle, subjects, totalMarks, obtainedMarks, percentage, remarks } = req.body;
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

export const getResultsByStudent = async (req, res) => {
  try {
    const { student } = req.params;
    const result = await req.db.query('SELECT * FROM results WHERE student_id = $1 ORDER BY created_at DESC', [student]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const createResult = async (req, res) => {
  try {
    const { student_id, exam_title, subject, marks_obtained, total_marks, remarks, recorded_by } = req.body;
    const result = await req.db.query(
      'INSERT INTO results (student_id, exam_title, subject, marks_obtained, total_marks, remarks, recorded_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [student_id, exam_title, subject, marks_obtained, total_marks, remarks, recorded_by || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

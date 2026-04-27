// syllabusModel.js - Syllabus DB schema and query helpers

export const syllabusModel = {
  table: 'syllabus',
  schema: `
    CREATE TABLE IF NOT EXISTS syllabus (
      id SERIAL PRIMARY KEY,
      teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
      class_level VARCHAR(20) NOT NULL,
      section VARCHAR(10),
      subject VARCHAR(100) NOT NULL,
      chapter VARCHAR(200) NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
};

export const getSyllabusByTeacher = async (pool, teacherId) => {
  const res = await pool.query(
    `SELECT * FROM syllabus WHERE teacher_id = $1 ORDER BY subject, created_at ASC`,
    [teacherId]
  );
  return res.rows;
};

export const createSyllabusEntry = async (pool, { teacherId, classLevel, section, subject, chapter, description }) => {
  const res = await pool.query(
    `INSERT INTO syllabus (teacher_id, class_level, section, subject, chapter, description)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [teacherId, classLevel, section ?? 'ALL', subject, chapter, description ?? null]
  );
  return res.rows[0];
};

export const updateSyllabusEntry = async (pool, id, { chapter, description, completed }) => {
  const res = await pool.query(
    `UPDATE syllabus SET chapter = COALESCE($2, chapter), description = COALESCE($3, description),
     completed = COALESCE($4, completed) WHERE id = $1 RETURNING *`,
    [id, chapter, description, completed]
  );
  return res.rows[0];
};

export const deleteSyllabusEntry = async (pool, id) => {
  const res = await pool.query('DELETE FROM syllabus WHERE id = $1 RETURNING id', [id]);
  return res.rows[0];
};

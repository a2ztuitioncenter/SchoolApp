export const examResultModel = {
  table: 'exam_results',
  schema: `
    CREATE TABLE IF NOT EXISTS exam_results (
      id SERIAL PRIMARY KEY,
      class_level VARCHAR(20) NOT NULL,
      section VARCHAR(20),
      roll_number VARCHAR(50),
      student_name VARCHAR(255) NOT NULL,
      exam_title VARCHAR(255) NOT NULL,
      subjects JSONB NOT NULL,
      total_marks NUMERIC(10, 2) NOT NULL,
      obtained_marks NUMERIC(10, 2) NOT NULL,
      percentage NUMERIC(5, 2) NOT NULL,
      remarks VARCHAR(20),
      teacher_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `
};

export const examResultModel = {
  table: 'exam_results',
  schema: `
    CREATE TABLE IF NOT EXISTS exam_results (
      id SERIAL PRIMARY KEY,
      "classLevel" VARCHAR(20) NOT NULL,
      section VARCHAR(20),
      "rollNumber" VARCHAR(50),
      "studentName" VARCHAR(255) NOT NULL,
      "examTitle" VARCHAR(255) NOT NULL,
      subjects JSONB NOT NULL,
      "totalMarks" NUMERIC(10, 2) NOT NULL,
      "obtainedMarks" NUMERIC(10, 2) NOT NULL,
      percentage NUMERIC(5, 2) NOT NULL,
      remarks VARCHAR(20),
      "teacherId" INTEGER REFERENCES users(id),
      "createdAt" TIMESTAMP DEFAULT NOW()
    );
  `
};

/**
 * results.js - Results/Exam Scores Model
 * Stores exam results for students
 */

export const resultsModel = {
  table: 'results',
  schema: `
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      "studentId" INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      exam_title VARCHAR(200) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      marks_obtained DECIMAL(5,2) NOT NULL,
      total_marks DECIMAL(5,2) NOT NULL,
      remarks TEXT,
      "recordedBy" INTEGER REFERENCES users(id),
      "schoolId" VARCHAR(50) DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_results_student ON results("studentId");
    CREATE INDEX IF NOT EXISTS idx_results_exam ON results(exam_title);
  `
};

/**
 * results.js - Results/Exam Scores Model
 * Stores exam results for students (Legacy - use exam_results for new entries)
 */

export const resultsModel = {
  table: 'results',
  schema: `
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      exam_title VARCHAR(200) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      marks_obtained DECIMAL(5,2) NOT NULL,
      total_marks DECIMAL(5,2) NOT NULL,
      remarks TEXT,
      recorded_by INTEGER REFERENCES users(id),
      school_id VARCHAR(50) DEFAULT 'school-001',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
    CREATE INDEX IF NOT EXISTS idx_results_exam ON results(exam_title);
  `,
  migration: `
    DO $$ 
    BEGIN 
      -- Rename results columns if they exist as camelCase
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='studentId') THEN
        ALTER TABLE results RENAME COLUMN "studentId" TO student_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='examTitle') THEN
        ALTER TABLE results RENAME COLUMN "examTitle" TO exam_title;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='marksObtained') THEN
        ALTER TABLE results RENAME COLUMN "marksObtained" TO marks_obtained;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='totalMarks') THEN
        ALTER TABLE results RENAME COLUMN "totalMarks" TO total_marks;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='recordedBy') THEN
        ALTER TABLE results RENAME COLUMN "recordedBy" TO recorded_by;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='schoolId') THEN
        ALTER TABLE results RENAME COLUMN "schoolId" TO school_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='createdAt') THEN
        ALTER TABLE results RENAME COLUMN "createdAt" TO created_at;
      END IF;

      -- Reset indexes to ensure they use correct columns
      DROP INDEX IF EXISTS idx_results_student;
      DROP INDEX IF EXISTS idx_results_exam;
    END $$;
  `
};

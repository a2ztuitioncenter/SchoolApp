export const examResultModel = {
  table: 'exam_results',
  schema: `
    CREATE TABLE IF NOT EXISTS exam_results (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      class_level VARCHAR(20) NOT NULL,
      section VARCHAR(20),
      roll_number VARCHAR(50),
      student_name VARCHAR(255) NOT NULL,
      exam_title VARCHAR(255) NOT NULL,
      subjects JSONB NOT NULL,
      total_marks NUMERIC(10, 2) NOT NULL,
      obtained_marks NUMERIC(10, 2) NOT NULL,
      percentage NUMERIC(5, 2) NOT NULL,
      remarks VARCHAR(500),
      teacher_id INTEGER REFERENCES users(id),
      school_id VARCHAR(50) DEFAULT 'school-001',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_teacher ON exam_results(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_title);
  `,
  migration: `
    DO $$ 
    BEGIN 
      -- Rename exam_results columns if they exist as camelCase
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='studentId') THEN
        ALTER TABLE exam_results RENAME COLUMN "studentId" TO student_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='classLevel') THEN
        ALTER TABLE exam_results RENAME COLUMN "classLevel" TO class_level;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='rollNumber') THEN
        ALTER TABLE exam_results RENAME COLUMN "rollNumber" TO roll_number;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='studentName') THEN
        ALTER TABLE exam_results RENAME COLUMN "studentName" TO student_name;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='examTitle') THEN
        ALTER TABLE exam_results RENAME COLUMN "examTitle" TO exam_title;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='totalMarks') THEN
        ALTER TABLE exam_results RENAME COLUMN "totalMarks" TO total_marks;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='obtainedMarks') THEN
        ALTER TABLE exam_results RENAME COLUMN "obtainedMarks" TO obtained_marks;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='teacherId') THEN
        ALTER TABLE exam_results RENAME COLUMN "teacherId" TO teacher_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='schoolId') THEN
        ALTER TABLE exam_results RENAME COLUMN "schoolId" TO school_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='createdAt') THEN
        ALTER TABLE exam_results RENAME COLUMN "createdAt" TO created_at;
      END IF;

      -- Reset indexes to ensure they use correct columns
      DROP INDEX IF EXISTS idx_exam_results_student;
      DROP INDEX IF EXISTS idx_exam_results_teacher;
      DROP INDEX IF EXISTS idx_exam_results_exam;
    END $$;
  `
};

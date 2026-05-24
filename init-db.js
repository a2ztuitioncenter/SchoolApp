/**
 * init-db.js
 * Standalone script to initialize the Tuition App database schema.
 * Creates missing tables with snake_case naming conventions. 
 * SAFE: Does not delete existing data.
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const isDev = process.env.NODE_ENV !== 'production';

const pool = new Pool({
  connectionString,
  ssl: isDev ? { rejectUnauthorized: false } : { rejectUnauthorized: true }
});
const schema = `
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('student', 'parent', 'teacher', 'staff', 'admin')) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    teacher_id VARCHAR(20),
    approved_by INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    username VARCHAR(50),
    status_updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    roll_number VARCHAR(20) UNIQUE NOT NULL,
    class_level VARCHAR(20) NOT NULL,
    section VARCHAR(10) DEFAULT 'A',
    parent_name VARCHAR(100),
    parent_phone VARCHAR(15),
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students (class_level, section);

-- 3. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_level VARCHAR(20),
    section VARCHAR(10),
    date DATE NOT NULL,
    is_present BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);

-- 4. Homework Table
CREATE TABLE IF NOT EXISTS homework (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    class_level VARCHAR(20) NOT NULL,
    section VARCHAR(10) DEFAULT 'ALL',
    subject VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATE,
    attachment_url VARCHAR(500),
    type VARCHAR(50) DEFAULT 'homework',
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_homework_class ON homework (class_level, section);

-- 5. Materials Table
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    class_level VARCHAR(20) NOT NULL,
    section VARCHAR(10) DEFAULT 'ALL',
    subject VARCHAR(100),
    file_url VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(15),
    uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by_id ON materials(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_materials_class_section ON materials(class_level, section);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    recipient_role VARCHAR(20) DEFAULT 'ALL',
    class_level VARCHAR(20),
    section VARCHAR(10) DEFAULT 'ALL',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    attachment_url VARCHAR(500),
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Exam Results Table
CREATE TABLE IF NOT EXISTS exam_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(100),
    roll_number VARCHAR(20),
    class_level VARCHAR(20),
    section VARCHAR(10),
    exam_title VARCHAR(200),
    subjects JSONB NOT NULL,
    total_marks DECIMAL(10,2),
    obtained_marks DECIMAL(10,2),
    percentage DECIMAL(5,2),
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results (student_id);

-- 8. Fees Table
CREATE TABLE IF NOT EXISTS fees (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP,
    transaction_id VARCHAR(100),
    payment_method VARCHAR(50),
    month VARCHAR(20),
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees (student_id);

-- 9. Timetable Table
CREATE TABLE IF NOT EXISTS timetable (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    class_level VARCHAR(20) NOT NULL,
    section VARCHAR(10) DEFAULT 'ALL',
    subject VARCHAR(100),
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Syllabus Table
CREATE TABLE IF NOT EXISTS syllabus (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_level VARCHAR(50) NOT NULL,
    section VARCHAR(10) DEFAULT 'ALL',
    subject VARCHAR(100) NOT NULL,
    chapter VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Teacher Class Assignment Table
CREATE TABLE IF NOT EXISTS teacher_class_assignment (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_level VARCHAR(20) NOT NULL,
    section VARCHAR(10) DEFAULT 'ALL',
    school_id VARCHAR(50) DEFAULT 'school-001',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(teacher_id, class_level, section)
);

-- 12. User Push Tokens Table
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    os VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, push_token)
);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
`;

async function init() {
  console.log('🚀 Synchronizing Database Schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('📝 Creating missing tables and indexes (if any)...');
    await client.query(schema);

    await client.query('COMMIT');
    console.log('\n✅ Database Schema Sync Completed Successfully!');
    console.log('Existing tables were kept intact. Missing tables were created.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Sync Failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

init();

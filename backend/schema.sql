-- =====================
-- ATTENDANCE TABLE
-- =====================
CREATE TABLE IF NOT EXISTS attendance (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_name   VARCHAR(50) NOT NULL,
  date         DATE NOT NULL,
  status       VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by    INTEGER REFERENCES users(id),
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- =====================
-- HOMEWORK TABLE (upgrade)
-- =====================
CREATE TABLE IF NOT EXISTS homework (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  class_name   VARCHAR(50) NOT NULL,
  subject      VARCHAR(100) NOT NULL,
  due_date     DATE,
  assigned_by  INTEGER REFERENCES users(id),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- =====================
-- FEES TABLE (upgrade)
-- =====================
CREATE TABLE IF NOT EXISTS fees (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount       DECIMAL(10, 2) NOT NULL,
  description  VARCHAR(200),
  due_date     DATE NOT NULL,
  paid         BOOLEAN DEFAULT FALSE,
  paid_date    DATE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class      ON attendance(class_name);
CREATE INDEX IF NOT EXISTS idx_fees_student          ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_paid             ON fees(paid);

-- 1. Users Table (Handles Login & Roles)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('Student', 'Parent', 'Teacher', 'Admin')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table (The Core Profile)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    class_level VARCHAR(50) NOT NULL,
    father_name VARCHAR(100),
    joining_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Blocked')) DEFAULT 'Active'
);

-- 3. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Present', 'Absent')) NOT NULL,
    UNIQUE(student_id, date) -- Prevents marking the same student twice on the same day
);

-- 4. Fees Table (For the Auto-Block System)
CREATE TABLE IF NOT EXISTS fees (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE
);
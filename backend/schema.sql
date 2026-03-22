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
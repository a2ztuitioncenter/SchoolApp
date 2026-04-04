-- Standardized Schema using Quoted CamelCase for Consistency with Models and JSON Payloads

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('student', 'parent', 'teacher', 'staff', 'admin')) NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    "classLevel" VARCHAR(50) NOT NULL,
    section VARCHAR(10),
    "fatherName" VARCHAR(100),
    "motherName" VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    "rollNumber" VARCHAR(20),
    "joiningDate" DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    "userId" INTEGER REFERENCES users(id),
    "classLevel" VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("studentId", date)
);

-- Homework Table
CREATE TABLE IF NOT EXISTS homework (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    "classLevel" VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    "dueDate" DATE,
    "assignedBy" INTEGER REFERENCES users(id),
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fees Table
CREATE TABLE IF NOT EXISTS fees (
    id SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    "userId" INTEGER REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(200),
    "dueDate" DATE NOT NULL,
    "isPaid" BOOLEAN DEFAULT FALSE,
    "paidDate" DATE,
    status VARCHAR(20) DEFAULT 'pending',
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timetable Table
CREATE TABLE IF NOT EXISTS timetable (
    id SERIAL PRIMARY KEY,
    "classLevel" VARCHAR(50) NOT NULL,
    "dayOfWeek" VARCHAR(15) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "teacherId" INTEGER REFERENCES users(id),
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materials Table
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    "classLevel" VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "uploadedBy" INTEGER REFERENCES users(id),
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    "recipientRole" VARCHAR(50),
    "classLevel" VARCHAR(50),
    "createdBy" INTEGER REFERENCES users(id),
    "schoolId" VARCHAR(50) DEFAULT 'school-001',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Results Table
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

-- Indices
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees("studentId");
CREATE INDEX IF NOT EXISTS idx_students_user ON students("userId");
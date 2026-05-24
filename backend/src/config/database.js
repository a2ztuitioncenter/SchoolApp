import pkg from 'pg';
import bcrypt from 'bcryptjs';

import { userModel } from '../features/auth/User.js';
import { studentModel } from '../features/student/Student.js';
import { feeModel } from '../features/fees/Fee.js';
import { homeworkModel } from '../features/homework/Homework.js';
import { attendanceModel } from '../features/attendance/Attendance.js';
import { materialModel } from '../features/materials/Material.js';
import { notificationModel } from '../features/notifications/Notification.js';
import { timetableModel } from '../features/student/Timetable.js';
import { syllabusModel } from '../features/teacher/syllabusModel.js';
import { examResultModel } from '../features/teacher/examResultModel.js';
import { resultsModel } from '../features/results/resultsModel.js';
import { contentPageModel } from '../features/admin/ContentPage.js';
import { storageModel } from '../features/storage/Storage.js';
import { auditLogModel } from '../features/admin/AuditLog.js';
import { doubtModel } from '../features/doubts/doubtModel.js';
import { supportModel } from '../features/support/Support.js';


import pool from './pool.js';

const globalSnakeCaseMigration = `
  DO $$ 
  BEGIN 
    -- 1. users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isActive') THEN
        ALTER TABLE users RENAME COLUMN "isActive" TO is_active;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='statusUpdatedAt') THEN
        ALTER TABLE users RENAME COLUMN "statusUpdatedAt" TO status_updated_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='schoolId') THEN
        ALTER TABLE users RENAME COLUMN "schoolId" TO school_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='createdAt') THEN
        ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='teacherId') THEN
        ALTER TABLE users RENAME COLUMN "teacherId" TO teacher_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approvedBy') THEN
        ALTER TABLE users RENAME COLUMN "approvedBy" TO approved_by;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='rejectionReason') THEN
        ALTER TABLE users RENAME COLUMN "rejectionReason" TO rejection_reason;
      END IF;
    END IF;

    -- 2. students table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='students') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='userId') THEN
        ALTER TABLE students RENAME COLUMN "userId" TO user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='createdAt') THEN
        ALTER TABLE students RENAME COLUMN "createdAt" TO created_at;
      END IF;
    END IF;

    -- 3. fees table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='fees') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='studentId') THEN
        ALTER TABLE fees RENAME COLUMN "studentId" TO student_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='userId') THEN
        ALTER TABLE fees RENAME COLUMN "userId" TO user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='dueDate') THEN
        ALTER TABLE fees RENAME COLUMN "dueDate" TO due_date;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='isPaid') THEN
        ALTER TABLE fees RENAME COLUMN "isPaid" TO is_paid;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='paidDate') THEN
        ALTER TABLE fees RENAME COLUMN "paidDate" TO paid_date;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='createdAt') THEN
        ALTER TABLE fees RENAME COLUMN "createdAt" TO created_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='schoolId') THEN
        ALTER TABLE fees RENAME COLUMN "schoolId" TO school_id;
      END IF;
    END IF;

    -- 4. attendance table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='attendance') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='userId') THEN
        ALTER TABLE attendance RENAME COLUMN "userId" TO user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='createdAt') THEN
        ALTER TABLE attendance RENAME COLUMN "createdAt" TO created_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='schoolId') THEN
        ALTER TABLE attendance RENAME COLUMN "schoolId" TO school_id;
      END IF;
    END IF;

    -- 5. timetable table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='timetable') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='dayOfWeek') THEN
        ALTER TABLE timetable RENAME COLUMN "dayOfWeek" TO day_of_week;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='startTime') THEN
        ALTER TABLE timetable RENAME COLUMN "startTime" TO start_time;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='endTime') THEN
        ALTER TABLE timetable RENAME COLUMN "endTime" TO end_time;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='teacherId') THEN
        ALTER TABLE timetable RENAME COLUMN "teacherId" TO teacher_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='classLevel') THEN
        ALTER TABLE timetable RENAME COLUMN "classLevel" TO class_level;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='createdAt') THEN
        ALTER TABLE timetable RENAME COLUMN "createdAt" TO created_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='schoolId') THEN
        ALTER TABLE timetable RENAME COLUMN "schoolId" TO school_id;
      END IF;
    END IF;

    -- 6. syllabus table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='syllabus') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='syllabus' AND column_name='teacherId') THEN
        ALTER TABLE syllabus RENAME COLUMN "teacherId" TO teacher_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='syllabus' AND column_name='classLevel') THEN
        ALTER TABLE syllabus RENAME COLUMN "classLevel" TO class_level;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='syllabus' AND column_name='createdAt') THEN
        ALTER TABLE syllabus RENAME COLUMN "createdAt" TO created_at;
      END IF;
    END IF;

    -- 7. teacher_class_assignment table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='teacher_class_assignment') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_class_assignment' AND column_name='teacherId') THEN
        ALTER TABLE teacher_class_assignment RENAME COLUMN "teacherId" TO teacher_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_class_assignment' AND column_name='classLevel') THEN
        ALTER TABLE teacher_class_assignment RENAME COLUMN "classLevel" TO class_level;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_class_assignment' AND column_name='createdAt') THEN
        ALTER TABLE teacher_class_assignment RENAME COLUMN "createdAt" TO created_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_class_assignment' AND column_name='schoolId') THEN
        ALTER TABLE teacher_class_assignment RENAME COLUMN "schoolId" TO school_id;
      END IF;
    END IF;

    -- 8. notifications table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='attachmentUrl') THEN
        ALTER TABLE notifications RENAME COLUMN "attachmentUrl" TO attachment_url;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='recipientRole') THEN
        ALTER TABLE notifications RENAME COLUMN "recipientRole" TO recipient_role;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='classLevel') THEN
        ALTER TABLE notifications RENAME COLUMN "classLevel" TO class_level;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='createdBy') THEN
        ALTER TABLE notifications RENAME COLUMN "createdBy" TO created_by;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='createdAt') THEN
        ALTER TABLE notifications RENAME COLUMN "createdAt" TO created_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='schoolId') THEN
        ALTER TABLE notifications RENAME COLUMN "schoolId" TO school_id;
      END IF;
    END IF;

    -- 9. exam_results table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='exam_results') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_results' AND column_name='createdAt') THEN
        ALTER TABLE exam_results RENAME COLUMN "createdAt" TO created_at;
      END IF;
    END IF;

    -- 10. homework table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='homework') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework' AND column_name='createdAt') THEN
        ALTER TABLE homework RENAME COLUMN "createdAt" TO created_at;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework' AND column_name='schoolId') THEN
        ALTER TABLE homework RENAME COLUMN "schoolId" TO school_id;
      END IF;
    END IF;
  END $$;
`;

const userPushTokensSchema = `
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

export async function initializeDatabase() {
    try {
        console.log('Checking/Creating database tables...');
        
        // 1. Run global snake_case rename migrations safely
        console.log('[INIT] Applying safe database migrations (snake_case column mapping)...');
        await pool.query(globalSnakeCaseMigration);

        // 2. Ensure user_push_tokens table is created
        console.log('[INIT] Ensuring user_push_tokens table exists...');
        await pool.query(userPushTokensSchema);
        
        // Run migrations for tables that underwent snake_case transition
        if (resultsModel.migration) await pool.query(resultsModel.migration);
        if (examResultModel.migration) await pool.query(examResultModel.migration);
        if (auditLogModel.migration) await pool.query(auditLogModel.migration);
        
        await pool.query(userModel.schema);
        await pool.query(auditLogModel.schema);
        await pool.query(studentModel.schema);

        await pool.query(feeModel.schema);
        await pool.query(homeworkModel.schema);
        await pool.query(attendanceModel.schema);
        await pool.query(materialModel.schema);
        await pool.query(notificationModel.schema);
        await pool.query(timetableModel.schema);
        await pool.query(syllabusModel.schema);
        await pool.query(examResultModel.schema);
        await pool.query(resultsModel.schema);
        await pool.query(contentPageModel.schema);
        await pool.query(storageModel.schema);
        await pool.query(doubtModel.schema);
        await pool.query(supportModel.schema);
        
        // 3. Migration: Add address column to students table if not exists
        console.log('[INIT] Running database migration: address column for students...');
        await pool.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT');

        console.log('Tables checked/created.');

        await seedContentPages();
        await createDefaultAdmin();
    } catch (err) {
        console.error('Database Initialization Error:', err.message);
        throw err;
    }
}

async function seedContentPages() {
    try {
        const count = await pool.query('SELECT COUNT(*) FROM content_pages');
        if (parseInt(count.rows[0].count) === 0) {
            console.log('Seeding baseline content pages...');
            for (const item of contentPageModel.baselineData) {
                await pool.query(
                    'INSERT INTO content_pages (key, content) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
                    [item.key, item.content]
                );
            }
            console.log('Baseline content pages seeded.');
        }
    } catch (err) {
        console.error('Error seeding content pages:', err.message);
        throw err;
    }
}

export async function createDefaultAdmin() {
    const adminPhone = process.env.ADMIN_PHONE;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME;

    if (!adminPhone || !adminPassword || !adminUsername) {
        throw new Error('ADMIN_PHONE, ADMIN_PASSWORD, and ADMIN_USERNAME are required when initializing the database');
    }

    const maskedPhone = adminPhone.slice(0, -2).replace(/./g, '*') + adminPhone.slice(-2);
    console.log(`Configuring Admin Account...`);

    try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        // Find if an admin user already exists in the database
        const exists = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");

        if (exists.rows.length === 0) {
            await pool.query(
                `INSERT INTO users (phone, email, password, role, is_active, username) VALUES ($1, $2, $3, $4, $5, $6)`,
                [adminPhone, 'admin@a2z.local', hashedPassword, 'admin', true, adminUsername]
            );
            console.log(`SUCCESS: Admin account created with phone ${maskedPhone}, username: ${adminUsername}`);
        } else {
            const adminId = exists.rows[0].id;
            await pool.query(
                `UPDATE users SET phone = $1, password = $2, is_active = true, username = $3 WHERE id = $4`,
                [adminPhone, hashedPassword, adminUsername, adminId]
            );
            console.log(`SUCCESS: Admin credentials synchronized to match env file (username: ${adminUsername})`);
        }
    } catch (err) {
        console.error('ERROR configuring admin account:', err.message);
        throw err;
    }
}

export default pool;

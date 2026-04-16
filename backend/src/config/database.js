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

import pool from './pool.js';

export async function initializeDatabase() {
    try {
        console.log('Checking/Creating database tables...');
        await pool.query(userModel.schema);
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
        console.log('Tables checked/created.');

        await createDefaultAdmin();
    } catch (err) {
        console.error('Database Initialization Error:', err.message);
    }
}

async function createDefaultAdmin() {
    const adminPhone = process.env.ADMIN_PHONE;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME;

    if (!adminPhone || !adminPassword || !adminUsername) {
        throw new Error('ADMIN_PHONE, ADMIN_PASSWORD, and ADMIN_USERNAME are required when initializing the database');
    }

    // Mask phone for privacy (e.g. ********77)
    const maskedPhone = adminPhone.slice(0, -2).replace(/./g, '*') + adminPhone.slice(-2);
    console.log(`👤 Configuring Admin Account for phone: ${maskedPhone}...`);

    try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Check if this specific admin exists
        const exists = await pool.query('SELECT id, role FROM users WHERE phone = $1', [adminPhone]);

        if (exists.rows.length === 0) {
            // Create new admin with username
            await pool.query(
                `INSERT INTO users (phone, email, password, role, "isActive", username) VALUES ($1, $2, $3, $4, $5, $6)`,
                [adminPhone, 'admin@a2z.local', hashedPassword, 'admin', true, adminUsername]
            );
            console.log(`SUCCESS: Admin account created with phone ${maskedPhone}, username: ${adminUsername}`);
        } else {
            // Update existing user to be admin with correct password and username
            await pool.query(
                `UPDATE users SET password = $1, role = 'admin', "isActive" = $3, username = COALESCE(NULLIF($4, ''), username, CONCAT('user_', id)) WHERE phone = $2`,
                [hashedPassword, adminPhone, true, adminUsername]
            );
            console.log(`SUCCESS: Admin credentials updated for ${maskedPhone}`);
        }
    } catch (err) {
        console.error('ERROR configuring admin account:', err.message);
    }
}

export default pool;

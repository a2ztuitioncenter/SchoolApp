import pkg from 'pg';

import { userModel } from '../features/auth/User.js';
import { studentModel } from '../features/student/Student.js';
import { feeModel } from '../features/fees/Fee.js';
import { homeworkModel } from '../features/homework/Homework.js';
import { attendanceModel } from '../features/attendance/Attendance.js';
import { materialModel } from '../features/materials/Material.js';
import { notificationModel } from '../features/notifications/Notification.js';
import { timetableModel } from '../features/student/Timetable.js';
import { syllabusModel } from '../features/teacher/syllabusModel.js';

import pool from './pool.js';

export async function initializeDatabase() {
  try {
    console.log('📋 Creating database tables...');
    await pool.query(userModel.schema);
    await pool.query(studentModel.schema);
    await pool.query(feeModel.schema);
    await pool.query(homeworkModel.schema);
    await pool.query(attendanceModel.schema);
    await pool.query(materialModel.schema);
    await pool.query(notificationModel.schema);
    await pool.query(timetableModel.schema);
    await pool.query(syllabusModel.schema);
    console.log('Tables checked/created.');

    await createDefaultAdmin();
    if (process.env.SEED_DB === 'true') {
      await seedDatabase();
    }
  } catch (err) {
    console.error('Database Initialization Error:', err.message);
  }
}

async function createDefaultAdmin() {
    const phone = '9999999999';
    const exists = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (exists.rows.length === 0) {
        await pool.query(
            `INSERT INTO users (phone, email, password, role) VALUES ($1, $2, $3, $4)`,
            [phone, 'admin@a2z.local', 'admin123', 'admin']
        );
        console.log('Default admin created.');
    }
}

async function seedDatabase() {
  try {
    const studentCount = await pool.query('SELECT COUNT(*) as count FROM students');
    if (parseInt(studentCount.rows[0].count) > 0) return;

    const sample = [
      { phone: '9999999991', name: 'Arun Kumar', classLevel: '10' },
      { phone: '9999999992', name: 'Priya Sharma', classLevel: '10' }
    ];

    for (const s of sample) {
      const uRes = await pool.query(
        `INSERT INTO users (phone, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id`,
        [s.phone, `${s.phone}@student.local`, 'password123', 'student']
      );
      const userId = uRes.rows[0].id;
      await pool.query(
        `INSERT INTO students ("userId", name, "classLevel", phone, email, "joiningDate") 
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
        [userId, s.name, s.classLevel, s.phone, `${s.phone}@student.local`]
      );
    }
    console.log('Database seeded.');
  } catch (err) {
    console.error('Seeding Error:', err.message);
  }
}

export { seedDatabase };
export default pool;
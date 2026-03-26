import pkg from 'pg';
import dotenv from 'dotenv';
import { userModel } from './models/User.js';
import { studentModel } from './models/Student.js';
import { feeModel } from './models/Fee.js';
import { homeworkModel } from './models/Homework.js';
import { attendanceModel } from './models/Attendance.js';
import { materialModel } from './models/Material.js';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tuition_app'
});

export async function initializeDatabase() {
  try {
    console.log('📋 Creating database tables...');
    await pool.query(userModel.schema);
    await pool.query(studentModel.schema);
    await pool.query(feeModel.schema);
    await pool.query(homeworkModel.schema);
    await pool.query(attendanceModel.schema);
    await pool.query(materialModel.schema);
    console.log('✅ Tables checked/created.');

    await createDefaultAdmin();
    if (process.env.SEED_DB === 'true') {
      await seedDatabase();
    }
  } catch (err) {
    console.error('❌ Database Initialization Error:', err.message);
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
        console.log('✅ Default admin created.');
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
    console.log('🌱 Database seeded.');
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  }
}

export { seedDatabase };
export default pool;
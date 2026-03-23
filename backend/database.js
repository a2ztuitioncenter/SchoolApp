import pkg from 'pg';
import dotenv from 'dotenv';
import { userModel } from './models/User.js';
import { studentModel } from './models/Student.js';
import { feeModel } from './models/Fee.js';
import { homeworkModel } from './models/Homework.js';
import { attendanceModel } from './models/Attendance.js';

const { Pool } = pkg;

dotenv.config();

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tuition_app'
});

// Initialize database - Create tables from schema
export async function initializeDatabase() {
  try {
    console.log('📋 Creating database tables...');
    
    // Create all tables from models
    await pool.query(userModel.schema);
    await pool.query(studentModel.schema);
    await pool.query(feeModel.schema);
    await pool.query(homeworkModel.schema);
    await pool.query(attendanceModel.schema);

    console.log('✅ All tables created successfully!');

    // Create default users
    await createDefaultAdmin();
    await createDefaultTeacher();
    await createDefaultParent();

    // Check if seeding should be done
    if (process.env.SEED_DB === 'true') {
      await seedDatabase();
    }
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    throw err;
  }
}

// Create default admin user
async function createDefaultAdmin() {
  try {
    const adminPhone = process.env.ADMIN_PHONE || '9999999999';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [adminPhone]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Default admin user already exists');
      return;
    }

    await pool.query(
      `INSERT INTO users (phone, email, password, role)
       VALUES ($1, $2, $3, $4)`,
      [adminPhone, 'admin@a2z.local', adminPassword, 'admin'] // Fixed to lowercase
    );

    console.log(`✅ Default admin user created: Phone=${adminPhone}`);
  } catch (err) {
    console.error('❌ Error creating default admin:', err.message);
    throw err;
  }
}

// Create default teacher user
async function createDefaultTeacher() {
  try {
    const teacherPhone = '8888888888';
    const teacherPassword = 'teacher123';

    const existingTeacher = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [teacherPhone]
    );

    if (existingTeacher.rows.length > 0) {
      console.log('✅ Default teacher user already exists');
      return;
    }

    await pool.query(
      `INSERT INTO users (phone, email, password, role)
       VALUES ($1, $2, $3, $4)`,
      [teacherPhone, 'teacher@a2z.local', teacherPassword, 'teacher'] // Fixed to lowercase
    );
    console.log(`✅ Default teacher user created: Phone=${teacherPhone}`);
  } catch (err) {
    console.error('❌ Error creating default teacher:', err.message);
    throw err;
  }
}

// Create default parent user
async function createDefaultParent() {
  try {
    const parentPhone = '7777777777';
    const parentPassword = 'parent123';

    const existingParent = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [parentPhone]
    );

    if (existingParent.rows.length > 0) {
      console.log('✅ Default parent user already exists');
      return;
    }

    await pool.query(
      `INSERT INTO users (phone, email, password, role)
       VALUES ($1, $2, $3, $4)`,
      [parentPhone, 'parent@a2z.local', parentPassword, 'parent'] // Fixed to lowercase
    );
    console.log(`✅ Default parent user created: Phone=${parentPhone}`);
  } catch (err) {
    console.error('❌ Error creating default parent:', err.message);
    throw err;
  }
}

// Seed database with sample data
async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    const studentCount = await pool.query('SELECT COUNT(*) as count FROM students');
    if (parseInt(studentCount.rows[0].count) > 0) {
      console.log('✅ Database already seeded, skipping...');
      return;
    }

    const sampleStudents = [
      { phone: '9999999991', name: 'Arun Kumar', classLevel: '10', section: 'A', rollNumber: '001' },
      { phone: '9999999992', name: 'Priya Sharma', classLevel: '10', section: 'A', rollNumber: '002' },
      { phone: '9999999993', name: 'Rajesh Patel', classLevel: '10', section: 'B', rollNumber: '001' },
      { phone: '9999999994', name: 'Neha Singh', classLevel: '9', section: 'A', rollNumber: '001' },
      { phone: '9999999995', name: 'Vikram Desai', classLevel: '9', section: 'B', rollNumber: '002' },
    ];

    const studentsCreated = [];

    for (const student of sampleStudents) {
      const userResult = await pool.query(
        `INSERT INTO users (phone, email, password, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (phone, role) DO UPDATE SET role = EXCLUDED.role
         RETURNING id`,
        [student.phone, `${student.phone}@student.local`, 'password123', 'student'] // Fixed to lowercase
      );

      const userId = userResult.rows[0].id;

      const studentResult = await pool.query(
        `INSERT INTO students (userId, name, classLevel, section, phone, email, rollNumber, "fatherName", "motherName", status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          userId,
          student.name,
          student.classLevel,
          student.section,
          student.phone,
          `${student.phone}@student.local`,
          student.rollNumber,
          `Father of ${student.name}`,
          `Mother of ${student.name}`,
          'active'
        ]
      );

      studentsCreated.push(studentResult.rows[0]);
    }

    console.log(`✅ Created ${studentsCreated.length} sample students`);

    // Create sample fees
    let feesCreated = 0;
    for (const student of studentsCreated) {
      const feeMonths = ['January', 'February', 'March', 'April', 'May', 'June'];
      for (let i = 0; i < feeMonths.length; i++) {
        const isPaid = i < 3; 
        await pool.query(
          `INSERT INTO fees (userId, "studentId", description, amount, "dueDate", status, "schoolId")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [student.userId, student.id, `Tuition Fee - ${feeMonths[i]}`, 5000, new Date(2025, i, 15), isPaid ? 'paid' : 'pending', 'school-001']
        );
        feesCreated++;
      }
    }
    console.log(`✅ Created ${feesCreated} fee records`);

    // Create sample attendance
    let attendanceCreated = 0;
    for (const student of studentsCreated) {
      const today = new Date();
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const attendanceDate = new Date(today);
        attendanceDate.setDate(today.getDate() - dayOffset);
        const isPresent = Math.random() > 0.2;

        await pool.query(
          `INSERT INTO attendance (userId, "studentId", "attendanceDate", status, "schoolId")
           VALUES ($1, $2, $3, $4, $5)`,
          [student.userId, student.id, attendanceDate.toISOString().split('T')[0], isPresent ? 'present' : 'absent', 'school-001']
        );
        attendanceCreated++;
      }
    }
    console.log(`✅ Created ${attendanceCreated} attendance records`);
    console.log('✅ Database seeding completed successfully!');

  } catch (err) {
    console.error('❌ Error seeding database:', err.message);
  }
}

export { seedDatabase };
export default pool;
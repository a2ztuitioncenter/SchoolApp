import pkg from 'pg';
import dotenv from 'dotenv';
import { userModel } from './models/User.js';
import { studentModel } from './models/Student.js';
import { feeModel } from './models/Fee.js';
import { homeworkModel } from './models/Homework.js';

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

    console.log('✅ All tables created successfully!');

    // Create default admin user (if not exists)
    await createDefaultAdmin();
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

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE phone = $1 AND role = $2',
      [adminPhone, 'admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Default admin user already exists');
      return;
    }

    // Create admin user - COMPLETELY CLEANED
    await pool.query(
      `INSERT INTO users (phone, email, password, role)
       VALUES ($1, $2, $3, $4)`,
      [
        adminPhone,
        'admin@a2z.local',
        adminPassword,
        'admin'
      ]
    );

    console.log(`✅ Default admin user created: Phone=${adminPhone}, Password=${adminPassword}`);
  } catch (err) {
    console.error('❌ Error creating default admin:', err.message);
    throw err;
  }
}

export default pool;
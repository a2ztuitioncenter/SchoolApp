import pkg from 'pg';
import dotenv from 'dotenv';

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
    
    // Create Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) UNIQUE NOT NULL,
        role VARCHAR(20) CHECK (role IN ('Student', 'Parent', 'Teacher', 'Admin')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Students Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        class_level VARCHAR(50) NOT NULL,
        father_name VARCHAR(100),
        joining_date DATE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('Active', 'Blocked')) DEFAULT 'Active'
      );
    `);

    // Create Attendance Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('Present', 'Absent')) NOT NULL,
        UNIQUE(student_id, date)
      );
    `);

    // Create Fees Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fees (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        due_date DATE NOT NULL,
        is_paid BOOLEAN DEFAULT FALSE
      );
    `);

    console.log('✅ Tables created successfully!');
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    throw err;
  }
}

// Seed database with sample data
export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Insert sample users
    const userResult = await pool.query(`
      INSERT INTO users (phone, role)
      VALUES
        ('03001234567', 'Student'),
        ('03007654321', 'Student'),
        ('03009876543', 'Student'),
        ('03001112222', 'Student'),
        ('03004445555', 'Student')
      ON CONFLICT (phone) DO NOTHING
      RETURNING id;
    `);

    if (userResult.rows.length === 0) {
      console.log('⚠️  Users already exist, skipping user insertion');
      const existingUsers = await pool.query('SELECT id FROM users LIMIT 5;');
      const userIds = existingUsers.rows.map(row => row.id);
      
      // Insert sample students
      await pool.query(`
        INSERT INTO students (user_id, name, class_level, father_name, joining_date, status)
        VALUES
          ($1, 'Ali Ahmed', 'Class 10', 'Ahmed Khan', '2024-01-15', 'Active'),
          ($2, 'Fatima Hassan', 'Class 9', 'Hassan Ali', '2024-02-10', 'Active'),
          ($3, 'Hassan Ibrahim', 'Class 11', 'Ibrahim Saad', '2023-06-20', 'Active'),
          ($4, 'Zainab Malik', 'Class 10', 'Malik Farooq', '2024-01-20', 'Active'),
          ($5, 'Muhammad Adnan', 'Class 9', 'Adnan Siddiqui', '2024-03-05', 'Active')
        ON CONFLICT DO NOTHING;
      `, userIds.slice(0, 5).map(id => id));
    } else {
      const userIds = userResult.rows.map(row => row.id);
      
      // Insert sample students
      await pool.query(`
        INSERT INTO students (user_id, name, class_level, father_name, joining_date, status)
        VALUES
          ($1, 'Ali Ahmed', 'Class 10', 'Ahmed Khan', '2024-01-15', 'Active'),
          ($2, 'Fatima Hassan', 'Class 9', 'Hassan Ali', '2024-02-10', 'Active'),
          ($3, 'Hassan Ibrahim', 'Class 11', 'Ibrahim Saad', '2023-06-20', 'Active'),
          ($4, 'Zainab Malik', 'Class 10', 'Malik Farooq', '2024-01-20', 'Active'),
          ($5, 'Muhammad Adnan', 'Class 9', 'Adnan Siddiqui', '2024-03-05', 'Active')
        ON CONFLICT DO NOTHING;
      `, userIds.slice(0, 5).map(id => id));
    }

    console.log('✅ Database seeded successfully!');
  } catch (err) {
    console.error('❌ Error seeding database:', err.message);
    throw err;
  }
}

export default pool;
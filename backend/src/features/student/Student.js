export const studentModel = {
  table: 'students',
  schema: `
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      class_level VARCHAR(50) NOT NULL,
      section VARCHAR(10),
      father_name VARCHAR(100),
      mother_name VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(255),
      roll_number VARCHAR(20),
      joining_date DATE NOT NULL,
      date_of_birth DATE DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'active',
      school_id VARCHAR(50) DEFAULT 'school-001',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
};

export const createStudent = async (pool, data) => {
  const {
    userId, name, classLevel, section, fatherName, motherName,
    phone, email, rollNumber, joiningDate, dateOfBirth, status, schoolId = 'school-001'
  } = data;
  const result = await pool.query(
    `INSERT INTO students (user_id, name, class_level, section, father_name, mother_name, phone, email, roll_number, joining_date, date_of_birth, status, school_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [userId, name, classLevel, section || null, fatherName || null, motherName || null,
     phone || null, email || null, rollNumber || null, joiningDate, dateOfBirth || null, status || 'active', schoolId]
  );
  return result.rows[0];
};

// Legacy export used by getStudentsBySchool call in adminRoutes
export const getStudentsBySchool = async (pool, schoolId) => {
  const result = await pool.query(
    'SELECT * FROM students WHERE school_id = $1 ORDER BY name ASC',
    [schoolId]
  );
  return result.rows;
};

export const getStudentByUserId = async (pool, userId) => {
  const result = await pool.query(
    'SELECT * FROM students WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
};

export const getStudentById = async (pool, id) => {
  const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
  return result.rows[0] || null;
};


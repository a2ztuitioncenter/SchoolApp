export const studentModel = {
  table: 'students',
  schema: `
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
      "dateOfBirth" DATE DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'active',
      "schoolId" VARCHAR(50) DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT NOW()
    );
  `,
};

export const createStudent = async (pool, data) => {
  const {
    userId, name, classLevel, section, fatherName, motherName,
    phone, email, rollNumber, joiningDate, dateOfBirth, status, schoolId = 'school-001'
  } = data;
  const result = await pool.query(
    `INSERT INTO students ("userId", name, "classLevel", section, "fatherName", "motherName", phone, email, "rollNumber", "joiningDate", "dateOfBirth", status, "schoolId")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [userId, name, classLevel, section || null, fatherName || null, motherName || null,
     phone || null, email || null, rollNumber || null, joiningDate, dateOfBirth || null, status || 'active', schoolId]
  );
  return result.rows[0];
};

// Helper to get all student fields aliased to camelCase
const STUDENT_FIELDS = `
  id, "userId", name, "classLevel", section, 
  "fatherName", "motherName", phone, email, 
  "rollNumber", "joiningDate", "dateOfBirth", 
  status, "schoolId", "createdAt"
`;

// Legacy export used by getStudentsBySchool call in adminRoutes
export const getStudentsBySchool = async (pool, schoolId) => {
  const result = await pool.query(
    `SELECT ${STUDENT_FIELDS} FROM students WHERE "schoolId" = $1 ORDER BY name ASC`,
    [schoolId]
  );
  return result.rows;
};

export const getStudentByUserId = async (pool, userId) => {
  const result = await pool.query(
    `SELECT ${STUDENT_FIELDS} FROM students WHERE "userId" = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

export const getStudentById = async (pool, id) => {
  const result = await pool.query(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = $1`, [id]);
  return result.rows[0] || null;
};


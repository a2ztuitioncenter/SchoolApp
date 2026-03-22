// Student.js - Student model containing academic and personal information
export const studentModel = {
  table: 'students',
  schema: `
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      "userId" INT NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      "classLevel" VARCHAR(10),
      section VARCHAR(5),
      "fatherName" VARCHAR(100),
      "motherName" VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(255),
      "joiningDate" DATE,
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
      "rollNumber" VARCHAR(20),
      "schoolId" VARCHAR(50) NOT NULL DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_students_userId ON students("userId");
    CREATE INDEX IF NOT EXISTS idx_students_rollNumber ON students("rollNumber");
    CREATE INDEX IF NOT EXISTS idx_students_schoolId ON students("schoolId");
  `,
};

// Helper to get student by userId
export const getStudentByUserId = async (pool, userId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM students WHERE userId = $1 LIMIT 1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching student by userId:', error);
    throw error;
  }
};

// Helper to get student by ID
export const getStudentById = async (pool, id) => {
  try {
    const result = await pool.query(
      'SELECT * FROM students WHERE id = $1 LIMIT 1',
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    throw error;
  }
};

// Helper to create a student record
export const createStudent = async (pool, studentData) => {
  const {
    userId,
    name,
    classLevel,
    section,
    fatherName,
    motherName,
    phone,
    email,
    joiningDate,
    status = 'active',
    rollNumber,
    schoolId = 'school-001',
  } = studentData;

  try {
    const result = await pool.query(
      `INSERT INTO students 
       (userId, name, classLevel, section, fatherName, motherName, phone, email, joiningDate, status, rollNumber, schoolId)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [userId, name, classLevel, section, fatherName, motherName, phone, email, joiningDate, status, rollNumber, schoolId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating student:', error);
    throw error;
  }
};

// Helper to update student
export const updateStudent = async (pool, id, studentData) => {
  const {
    name,
    classLevel,
    section,
    fatherName,
    motherName,
    phone,
    email,
    status,
  } = studentData;

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount}`);
    values.push(name);
    paramCount++;
  }
  if (classLevel !== undefined) {
    updates.push(`classLevel = $${paramCount}`);
    values.push(classLevel);
    paramCount++;
  }
  if (section !== undefined) {
    updates.push(`section = $${paramCount}`);
    values.push(section);
    paramCount++;
  }
  if (fatherName !== undefined) {
    updates.push(`fatherName = $${paramCount}`);
    values.push(fatherName);
    paramCount++;
  }
  if (motherName !== undefined) {
    updates.push(`motherName = $${paramCount}`);
    values.push(motherName);
    paramCount++;
  }
  if (phone !== undefined) {
    updates.push(`phone = $${paramCount}`);
    values.push(phone);
    paramCount++;
  }
  if (email !== undefined) {
    updates.push(`email = $${paramCount}`);
    values.push(email);
    paramCount++;
  }
  if (status !== undefined) {
    updates.push(`status = $${paramCount}`);
    values.push(status);
    paramCount++;
  }

  if (updates.length === 0) return null;

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

// Helper to get all students for a school
export const getStudentsBySchool = async (pool, schoolId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM students WHERE schoolId = $1 ORDER BY name ASC',
      [schoolId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching students by school:', error);
    throw error;
  }
};

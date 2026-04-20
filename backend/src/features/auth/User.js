import bcrypt from 'bcryptjs';

export const userModel = {
  table: 'users',
  schema: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      phone VARCHAR(15) NOT NULL,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) CHECK (role IN ('student', 'parent', 'teacher', 'staff', 'admin')) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      school_id VARCHAR(50) DEFAULT 'school-001',
      created_at TIMESTAMP DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'active',
      teacher_id VARCHAR(20),
      approved_by INTEGER,
      rejection_reason TEXT,
      username VARCHAR(50),
      status_updated_at TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username));
    CREATE INDEX IF NOT EXISTS users_school_role_idx ON users (school_id, role, status);

    CREATE TABLE IF NOT EXISTS teacher_class_assignment (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      class_level VARCHAR(20) NOT NULL,
      section VARCHAR(10) DEFAULT 'ALL',
      school_id VARCHAR(50) DEFAULT 'school-001',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(teacher_id, class_level, section)
    );
  `,
};

export const getUserByPhone = async (pool, phone) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return result.rows[0] || null;
};
export const getUsersByPhone = async (pool, phone) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return result.rows;
};

export const countStudentsByPhone = async (pool, phone) => {
  const result = await pool.query(
    "SELECT COUNT(*) FROM users WHERE phone = $1 AND role = 'student'",
    [phone]
  );
  return parseInt(result.rows[0].count);
};

export const isDuplicateStudent = async (pool, phone, name, classLevel, dateOfBirth, fatherName = null, motherName = null) => {
  let query = `
    SELECT u.id FROM users u
    JOIN students s ON u.id = s."userId"
    WHERE u.phone = $1 AND LOWER(u.name) = LOWER($2) 
      AND s."classLevel" = $3 AND s."dateOfBirth" = $4
  `;
  const params = [phone, name, classLevel, dateOfBirth];
  
  if (fatherName) {
    query += ` AND LOWER(s."fatherName") = LOWER($${params.length + 1})`;
    params.push(fatherName);
  }
  if (motherName) {
    query += ` AND LOWER(s."motherName") = LOWER($${params.length + 1})`;
    params.push(motherName);
  }
  
  query += ` LIMIT 1`;
  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

export const getNonStudentByPhone = async (pool, phone) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE phone = $1 AND role != 'student' LIMIT 1",
    [phone]
  );
  return result.rows[0] || null;
};


export const getUserByUsername = async (pool, username) => {
  const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return result.rows[0] || null;
};

export const getUserByPhoneOrUsername = async (pool, identifier) => {
  const isPhone = /^\d{10}$/.test(identifier);
  if (isPhone) return getUserByPhone(pool, identifier);
  return getUserByUsername(pool, identifier);
};

export const isUsernameTaken = async (pool, username) => {
  const result = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return result.rows.length > 0;
};

export const getUserById = async (pool, id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const createUser = async (pool, { name, phone, email, password, role, schoolId = 'school-001', teacherId = null, username = null, status = 'pending' }) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, phone, email, password, role, status, "schoolId", "teacherId", username)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [name || null, phone, email || null, hashedPassword, role, status, schoolId, teacherId, username]
  );
  return result.rows[0];
};

export const updateUser = async (pool, id, { name, phone, email, role }) => {
  const result = await pool.query(
    `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone), email = COALESCE($4, email), role = COALESCE($5, role)
     WHERE id = $1 RETURNING *`,
    [id, name, phone, email, role]
  );
  return result.rows[0] || null;
};

export const deleteUser = async (pool, id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Column names updated to snake_case
    await client.query('UPDATE attendance SET "userId" = NULL WHERE "userId" = $1', [id]);
    await client.query('UPDATE homework SET teacher_id = NULL WHERE teacher_id = $1', [id]);
    await client.query('UPDATE fees SET "userId" = NULL WHERE "userId" = $1', [id]);
    await client.query('UPDATE exam_results SET teacher_id = NULL WHERE teacher_id = $1', [id]);
    await client.query('UPDATE notifications SET "createdBy" = NULL WHERE "createdBy" = $1', [id]);
    await client.query('UPDATE users SET "approvedBy" = NULL WHERE "approvedBy" = $1', [id]);

    await client.query('DELETE FROM timetable WHERE "teacherId" = $1', [id]);
    await client.query('DELETE FROM syllabus WHERE "teacherId" = $1', [id]);
    await client.query('DELETE FROM teacher_class_assignment WHERE "teacherId" = $1', [id]);
    await client.query('DELETE FROM students WHERE "userId" = $1', [id]);

    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const toggleUserStatus = async (pool, id, isActive) => {
  const result = await pool.query(
    'UPDATE users SET "isActive" = $2 WHERE id = $1 RETURNING *',
    [id, isActive]
  );
  return result.rows[0] || null;
};

export const getApprovedUser = async (pool, phone) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE phone = $1 AND status = $2',
    [phone, 'active']
  );
  return result.rows[0] || null;
};

export const getUsersByStatus = async (pool, status, schoolId = 'school-001') => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.phone, u.email, u.role, u."isActive", 
            u."schoolId", u."createdAt", u.status, 
            u."teacherId", u.username,
            s."classLevel", s.section, s."rollNumber"
     FROM users u
     LEFT JOIN students s ON u.id = s."userId"
     WHERE u.status = $1 AND u."schoolId" = $2 
     ORDER BY u."createdAt" DESC`,
    [status, schoolId]
  );
  return result.rows;
};

export const updateUserStatus = async (pool, userId, newStatus, approvedByAdminId = null, rejectionReason = null) => {
  const result = await pool.query(
    `UPDATE users 
     SET status = $2, "approvedBy" = $3, "rejectionReason" = $4, "statusUpdatedAt" = NOW()
     WHERE id = $1 RETURNING *`,
    [userId, newStatus, approvedByAdminId, rejectionReason]
  );
  return result.rows[0] || null;
};

export const generateTeacherId = async (pool, role) => {
  const prefix = role === 'teacher' ? 'T' : role === 'staff' ? 'S' : 'T';
  let teacherId;
  let isUnique = false;
  while (!isUnique) {
    const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    teacherId = `${prefix}${randomDigits}`;
    const result = await pool.query('SELECT id FROM users WHERE "teacherId" = $1', [teacherId]);
    isUnique = result.rows.length === 0;
  }
  return teacherId;
};

export const assignTeacherToClasses = async (pool, teacherId, classesAssigned, schoolId = 'school-001') => {
  if (!Array.isArray(classesAssigned)) throw new Error('classesAssigned must be an array');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM teacher_class_assignment WHERE "teacherId" = $1', [teacherId]);
    for (const assignment of classesAssigned) {
      let classLevel, section = 'ALL';
      if (typeof assignment === 'object' && assignment !== null) {
        classLevel = assignment.class || assignment.classLevel;
        section = assignment.section || 'ALL';
      } else {
        classLevel = assignment;
      }
      
      if (classLevel) {
        await client.query(
          `INSERT INTO teacher_class_assignment ("teacherId", "classLevel", section, "schoolId")
           VALUES ($1, $2, $3, $4)`,
          [teacherId, classLevel, section, schoolId]
        );
      }
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getTeacherAssignments = async (pool, teacherId) => {
  const result = await pool.query(
    'SELECT "classLevel" FROM teacher_class_assignment WHERE "teacherId" = $1',
    [teacherId]
  );
  return result.rows.map(row => row.classLevel);
};

export const getClassLevels = async (pool, schoolId = 'school-001') => {
  const result = await pool.query(
    `SELECT DISTINCT "classLevel" FROM students WHERE "schoolId" = $1 ORDER BY "classLevel" ASC`,
    [schoolId]
  );
  return result.rows.map(row => row.classLevel);
};

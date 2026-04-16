import db from '../../config/database.js';
import bcrypt from 'bcryptjs';

export const userModel = {
  table: 'users',
  schema: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      phone VARCHAR(15) UNIQUE NOT NULL,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) CHECK (role IN ('student', 'parent', 'teacher', 'staff', 'admin')) NOT NULL,
      "isActive" BOOLEAN DEFAULT TRUE,
      "schoolId" VARCHAR(50) DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "teacherId" VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "approvedBy" INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "statusUpdatedAt" TIMESTAMP;

    CREATE TABLE IF NOT EXISTS teacher_class_assignment (
      id SERIAL PRIMARY KEY,
      "teacherId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      "classLevel" VARCHAR(20) NOT NULL,
      section VARCHAR(10) DEFAULT 'ALL',
      "schoolId" VARCHAR(50) DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("teacherId", "classLevel", section)
    );
  `,
};

export const getUserByPhone = async (pool, phone) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return result.rows[0] || null;
};

/**
 * Find user by username (case-insensitive)
 */
export const getUserByUsername = async (pool, username) => {
  const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return result.rows[0] || null;
};

/**
 * Find user by phone OR username (for unified login)
 * Detects input type: if all digits → phone lookup, otherwise → username lookup
 */
export const getUserByPhoneOrUsername = async (pool, identifier) => {
  const isPhone = /^\d{10}$/.test(identifier);
  if (isPhone) {
    return getUserByPhone(pool, identifier);
  }
  return getUserByUsername(pool, identifier);
};

/**
 * Check if a username is already taken (case-insensitive)
 */
export const isUsernameTaken = async (pool, username) => {
  const result = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return result.rows.length > 0;
};

export const getUserById = async (pool, id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const createUser = async (pool, { name, phone, email, password, role, schoolId = 'school-001', teacherId = null, username = null }) => {
  // Hash the password before storing
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await pool.query(
    `INSERT INTO users (name, phone, email, password, role, status, "schoolId", "teacherId", username)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, phone, email, role, status, "teacherId", "isActive", "createdAt", username`,
    [name || null, phone, email || null, hashedPassword, role, 'pending', schoolId, teacherId, username]
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
  // Start a transaction for a clean deletion process
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Manual cleanup of foreign key dependencies
    // Use SET NULL for historical tracking records
    await client.query('UPDATE attendance SET "userId" = NULL WHERE "userId" = $1', [id]);
    await client.query('UPDATE homework SET "teacherId" = NULL WHERE "teacherId" = $1', [id]);
    await client.query('UPDATE fees SET "userId" = NULL WHERE "userId" = $1', [id]);
    await client.query('UPDATE results SET "recordedBy" = NULL WHERE "recordedBy" = $1', [id]);
    await client.query('UPDATE exam_results SET "teacherId" = NULL WHERE "teacherId" = $1', [id]);
    await client.query('UPDATE notifications SET "createdBy" = NULL WHERE "createdBy" = $1', [id]);
    await client.query('UPDATE users SET "approvedBy" = NULL WHERE "approvedBy" = $1', [id]);

    // Delete child records that shouldn't exist without a user
    await client.query('DELETE FROM timetable WHERE "teacherId" = $1', [id]);
    await client.query('DELETE FROM syllabus WHERE "teacherId" = $1', [id]);
    await client.query('DELETE FROM teacher_class_assignment WHERE "teacherId" = $1', [id]);
    await client.query('DELETE FROM students WHERE "userId" = $1', [id]);

    // Finally delete the user
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[deleteUser] Transaction failed:', err.message);
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

/**
 * Get user by phone and check if approved (status = 'active')
 * Used for login verification
 */
export const getApprovedUser = async (pool, phone) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE phone = $1 AND status = $2',
    [phone, 'active']
  );
  return result.rows[0] || null;
};

/**
 * Get all users with a specific status
 * Used by admin to view pending/active/rejected users
 */
export const getUsersByStatus = async (pool, status, schoolId = 'school-001') => {
  const result = await pool.query(
    `SELECT u.id, COALESCE(u.name, s.name) as name, u.phone, u.email, u.role, u.status, u."createdAt", u."approvedBy", u."rejectionReason", u."statusUpdatedAt",
            s."classLevel", s.section
     FROM users u
     LEFT JOIN students s ON u.id = s."userId"
     WHERE u.status = $1 AND u."schoolId" = $2 
     ORDER BY u."createdAt" DESC`,
    [status, schoolId]
  );
  return result.rows;
};

/**
 * Update user approval status
 * Called by admin to approve/reject users
 */
export const updateUserStatus = async (pool, userId, newStatus, approvedByAdminId = null, rejectionReason = null) => {
  const result = await pool.query(
    `UPDATE users 
     SET status = $2, "approvedBy" = $3, "rejectionReason" = $4, "statusUpdatedAt" = NOW()
     WHERE id = $1 RETURNING id, name, phone, email, role, status, "createdAt", "approvedBy", "statusUpdatedAt"`,
    [userId, newStatus, approvedByAdminId, rejectionReason]
  );
  return result.rows[0] || null;
};

/**
 * Generate unique teacherId in format T##### or S##### (5 random digits)
 * T = teacher, S = staff
 */
export const generateTeacherId = async (pool, role) => {
  const prefix = role === 'teacher' ? 'T' : role === 'staff' ? 'S' : 'T';
  let teacherId;
  let isUnique = false;
  
  // Keep trying until we find a unique ID (extremely rare collisions)
  while (!isUnique) {
    const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    teacherId = `${prefix}${randomDigits}`;
    
    const result = await pool.query('SELECT id FROM users WHERE "teacherId" = $1', [teacherId]);
    isUnique = result.rows.length === 0;
  }
  
  return teacherId;
};

/**
 * Assign teacher/staff to classes
 * Creates entries in teacher_class_assignment table
 */
export const assignTeacherToClasses = async (pool, teacherId, classesAssigned, schoolId = 'school-001') => {
  if (!Array.isArray(classesAssigned)) {
    throw new Error('classesAssigned must be an array');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First clear old assignments
    await client.query('DELETE FROM teacher_class_assignment WHERE "teacherId" = $1', [teacherId]);
    
    // Then add new ones if any
    for (const classLevel of classesAssigned) {
      await client.query(
        `INSERT INTO teacher_class_assignment ("teacherId", "classLevel", "schoolId")
         VALUES ($1, $2, $3)`,
        [teacherId, classLevel, schoolId]
      );
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning teacher to classes:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get current class assignments for a teacher/staff
 */
export const getTeacherAssignments = async (pool, teacherId) => {
  const result = await pool.query(
    'SELECT "classLevel" FROM teacher_class_assignment WHERE "teacherId" = $1',
    [teacherId]
  );
  return result.rows.map(row => row.classLevel);
};

/**
 * Get list of all unique class levels
 * Used by admin when assigning classes to teachers/staff
 */
export const getClassLevels = async (pool, schoolId = 'school-001') => {
  const result = await pool.query(
    `SELECT DISTINCT "classLevel" FROM students WHERE "schoolId" = $1 ORDER BY "classLevel" ASC`,
    [schoolId]
  );
  return result.rows.map(row => row.classLevel);
};

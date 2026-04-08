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
  `,
};

export const getUserByPhone = async (pool, phone) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return result.rows[0] || null;
};

export const getUserById = async (pool, id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const createUser = async (pool, { name, phone, email, password, role, schoolId = 'school-001' }) => {
  // Hash the password before storing
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await pool.query(
    `INSERT INTO users (name, phone, email, password, role, status, "schoolId")
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, phone, email, role, status, "isActive", "createdAt"`,
    [name || null, phone, email || null, hashedPassword, role, 'pending', schoolId]
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
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
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
    `SELECT id, name, phone, email, role, status, "createdAt", "approvedBy", "rejectionReason", "statusUpdatedAt"
     FROM users WHERE status = $1 AND "schoolId" = $2 ORDER BY "createdAt" DESC`,
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

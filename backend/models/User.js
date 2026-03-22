// User.js - User model representing system users (students, teachers, admins)
export const userModel = {
  table: 'users',
  schema: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(255),
      password VARCHAR(255),
      role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
      "schoolId" VARCHAR(50) NOT NULL DEFAULT 'school-001',
      "isActive" BOOLEAN DEFAULT TRUE,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_schoolId ON users("schoolId");
  `,
};

// Helper to find user by phone
export const getUserByPhone = async (pool, phone) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1 LIMIT 1',
      [phone]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching user by phone:', error);
    throw error;
  }
};

// Helper to find user by ID
export const getUserById = async (pool, id) => {
  try {
    const result = await pool.query(
      'SELECT id, phone, email, role, schoolId, isActive, createdAt, updatedAt FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
};

// Helper to create a user record
export const createUser = async (pool, userData) => {
  const {
    phone,
    email,
    password,
    role,
    schoolId = 'school-001',
  } = userData;

  try {
    const result = await pool.query(
      `INSERT INTO users (phone, email, password, role, schoolId) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, phone, email, role, schoolId, isActive, createdAt, updatedAt`,
      [phone, email, password, role, schoolId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Helper to update user
export const updateUser = async (pool, id, userData) => {
  const { email, role, isActive } = userData;
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (email !== undefined) {
    updates.push(`email = $${paramCount}`);
    values.push(email);
    paramCount++;
  }
  if (role !== undefined) {
    updates.push(`role = $${paramCount}`);
    values.push(role);
    paramCount++;
  }
  if (isActive !== undefined) {
    updates.push(`isActive = $${paramCount}`);
    values.push(isActive);
    paramCount++;
  }

  if (updates.length === 0) return null;

  updates.push(`updatedAt = CURRENT_TIMESTAMP`);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

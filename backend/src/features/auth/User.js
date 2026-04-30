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
      status_updated_at TIMESTAMP,
      avatar_url TEXT,
      avatar_drive_id VARCHAR(100)
    );
  `,
};

const MAP_USER = (u) => {
    if (!u) return null;
    return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        schoolId: u.school_id,
        createdAt: u.created_at,
        status: u.status,
        teacherId: u.teacher_id,
        approvedBy: u.approved_by,
        rejectionReason: u.rejection_reason,
        username: u.username,
        statusUpdatedAt: u.status_updated_at,
        avatarUrl: u.avatar_url,
        avatarDriveId: u.avatar_drive_id,
        lastLoginAt: u.last_login_at,
        designation: u.designation
    };
};

export const getUserByPhone = async (pool, phone, includePassword = false) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  const user = MAP_USER(result.rows[0]);
  if (user && includePassword) user.password = result.rows[0].password;
  return user;
};

export const updateLastLogin = async (pool, userId) => {
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
};
export const getUsersByPhone = async (pool, phone) => {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return result.rows.map(MAP_USER);
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
    JOIN students s ON u.id = s.user_id
    WHERE u.phone = $1 AND LOWER(u.name) = LOWER($2) 
      AND s.class_level = $3 AND s.date_of_birth = $4
  `;
  const params = [phone, name, classLevel, dateOfBirth];
  
  if (fatherName) {
    query += ` AND LOWER(s.father_name) = LOWER($${params.length + 1})`;
    params.push(fatherName);
  }
  if (motherName) {
    query += ` AND LOWER(s.mother_name) = LOWER($${params.length + 1})`;
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
  return MAP_USER(result.rows[0]);
};

export const getUserByUsername = async (pool, username, includePassword = false) => {
  const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  const user = MAP_USER(result.rows[0]);
  if (user && includePassword) user.password = result.rows[0].password;
  return user;
};

export const getUserByPhoneOrUsername = async (pool, identifier, includePassword = false) => {
  const isPhone = /^\+?\d{10,15}$/.test(identifier);
  if (isPhone) return getUserByPhone(pool, identifier, includePassword);
  return getUserByUsername(pool, identifier, includePassword);
};

export const isUsernameTaken = async (pool, username) => {
  const result = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return result.rows.length > 0;
};

export const getUserById = async (pool, id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return MAP_USER(result.rows[0]);
};

export const createUser = async (pool, { name, phone, email, password, role, schoolId = 'school-001', teacherId = null, username = null, status = 'pending' }) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, phone, email, password, role, status, school_id, teacher_id, username)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [name || null, phone, email || null, hashedPassword, role, status, schoolId, teacherId, username]
  );
  return MAP_USER(result.rows[0]);
};

export const updateUser = async (pool, id, { name, phone, email, role }, schoolId) => {
  const result = await pool.query(
    `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone), email = COALESCE($4, email), role = COALESCE($5, role)
     WHERE id = $1 AND school_id = $6 RETURNING *`,
    [id, name, phone, email, role, schoolId]
  );
  return MAP_USER(result.rows[0]);
};

export const deleteUser = async (pool, id, schoolId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Standard snake_case identifiers
    await client.query('UPDATE attendance SET user_id = NULL WHERE user_id = $1', [id]);
    await client.query('UPDATE homework SET teacher_id = NULL WHERE teacher_id = $1', [id]);
    await client.query('UPDATE fees SET user_id = NULL WHERE user_id = $1', [id]);
    await client.query('UPDATE exam_results SET teacher_id = NULL WHERE teacher_id = $1', [id]);
    await client.query('UPDATE notifications SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('UPDATE users SET approved_by = NULL WHERE approved_by = $1', [id]);

    await client.query('DELETE FROM timetable WHERE teacher_id = $1', [id]);
    await client.query('DELETE FROM syllabus WHERE teacher_id = $1', [id]);
    await client.query('DELETE FROM teacher_class_assignment WHERE teacher_id = $1', [id]);
    await client.query('DELETE FROM students WHERE user_id = $1', [id]);

    const result = await client.query('DELETE FROM users WHERE id = $1 AND school_id = $2 RETURNING id', [id, schoolId]);
    
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const toggleUserStatus = async (pool, id, isActive, schoolId) => {
  const result = await pool.query(
    'UPDATE users SET is_active = $2 WHERE id = $1 AND school_id = $3 RETURNING *',
    [id, isActive, schoolId]
  );
  return MAP_USER(result.rows[0]);
};

export const getApprovedUser = async (pool, phone) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE phone = $1 AND status = $2',
    [phone, 'active']
  );
  return MAP_USER(result.rows[0]);
};

export const getUsersByStatus = async (pool, status, schoolId = 'school-001') => {
  const result = await pool.query(
    `SELECT u.*, 
            s.class_level, s.section, s.roll_number
     FROM users u
     LEFT JOIN students s ON u.id = s.user_id
     WHERE u.status = $1 AND u.school_id = $2 
     ORDER BY u.created_at DESC`,
    [status, schoolId]
  );
  // Keep the joint student fields for the frontend
  return result.rows.map(u => ({
      ...MAP_USER(u),
      classLevel: u.class_level,
      section: u.section,
      rollNumber: u.roll_number
  }));
};

export const updateUserStatus = async (pool, userId, newStatus, approvedByAdminId = null, rejectionReason = null) => {
    const result = await pool.query(
      `UPDATE users 
       SET status = $2, approved_by = $3, rejection_reason = $4, status_updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [userId, newStatus, approvedByAdminId, rejectionReason]
    );
  return MAP_USER(result.rows[0]);
};

export const generateTeacherId = async (pool, role) => {
  const prefix = role === 'teacher' ? 'T' : role === 'staff' ? 'S' : 'T';
  let teacherId;
  let isUnique = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 50;

  while (!isUnique && attempts < MAX_ATTEMPTS) {
    const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    teacherId = `${prefix}${randomDigits}`;
    const result = await pool.query('SELECT id FROM users WHERE teacher_id = $1', [teacherId]);
    isUnique = result.rows.length === 0;
    attempts++;
  }

  if (!isUnique) {
    // Fallback using timestamp + random suffix for better uniqueness
    const suffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    teacherId = `${prefix}${suffix}`;
    // Still verify uniqueness
    const check = await pool.query('SELECT id FROM users WHERE teacher_id = $1', [teacherId]);
    if (check.rows.length > 0) {
      throw new Error('Unable to generate unique teacher ID');
    }
  }

  return teacherId;
};

export const assignTeacherToClasses = async (pool, userId, classesAssigned, schoolId = 'school-001') => {
  if (!Array.isArray(classesAssigned)) throw new Error('classesAssigned must be an array');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM teacher_class_assignment WHERE teacher_id = $1', [userId]);
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
          `INSERT INTO teacher_class_assignment (teacher_id, class_level, section, school_id)
           VALUES ($1, $2, $3, $4)`,
          [userId, classLevel, section, schoolId]
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

export const getTeacherAssignments = async (pool, userId) => {
  const result = await pool.query(
    'SELECT class_level FROM teacher_class_assignment WHERE teacher_id = $1',
    [userId]
  );
  return result.rows.map(row => row.class_level);
};

export const getClassLevels = async (pool, schoolId = 'school-001') => {
  const result = await pool.query(
    `SELECT DISTINCT class_level FROM students WHERE school_id = $1 ORDER BY class_level ASC`,
    [schoolId]
  );
  return result.rows.map(row => row.class_level);
};

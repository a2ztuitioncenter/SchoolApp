import db from '../pool.js';

export const homeworkModel = {
  table: 'homework',
  schema: `
    CREATE TABLE IF NOT EXISTS homework (
      id SERIAL PRIMARY KEY,
      "teacherId" INTEGER REFERENCES users(id),
      "classLevel" VARCHAR(50) NOT NULL,
      section VARCHAR(10),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      "dueDate" DATE,
      subject VARCHAR(100),
      "attachmentUrl" VARCHAR(500),
      "schoolId" VARCHAR(50) DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT NOW()
    );
  `,

  async getAll(classLevel = '') {
    let query = `SELECT h.*, u.phone AS "teacherPhone"
                 FROM homework h
                 LEFT JOIN users u ON h."teacherId" = u.id`;
    const params = [];
    if (classLevel) { query += ` WHERE h."classLevel" = $1`; params.push(classLevel); }
    query += ` ORDER BY h."createdAt" DESC`;
    const result = await db.query(query, params);
    return result.rows;
  },

  async getByClass(classLevel) {
    return this.getAll(classLevel);
  },

  async getById(id) {
    const result = await db.query('SELECT * FROM homework WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create({ title, description, classLevel, subject, dueDate, assignedBy }) {
    const result = await db.query(
      `INSERT INTO homework (title, description, "classLevel", subject, "dueDate", "teacherId")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || null, classLevel, subject || null, dueDate || null, assignedBy || null]
    );
    return result.rows[0];
  },

  async update(id, { title, description, classLevel, subject, dueDate }) {
    const result = await db.query(
      `UPDATE homework SET title=$1, description=$2, "classLevel"=$3, subject=$4, "dueDate"=$5 WHERE id=$6 RETURNING *`,
      [title, description || null, classLevel, subject || null, dueDate || null, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await db.query('DELETE FROM homework WHERE id=$1 RETURNING id', [id]);
    return result.rows[0] || null;
  }
};

// Legacy pool-based named exports used by teacherRoutes.js and studentRoutes.js
export const getHomeworkByClass = async (pool, classLevel, section = null) => {
  let query = `SELECT h.*, u.phone AS "teacherPhone"
               FROM homework h
               LEFT JOIN users u ON h."teacherId" = u.id
               WHERE h."classLevel" = $1`;
  const params = [classLevel];
  if (section) { query += ` AND h.section = $2`; params.push(section); }
  query += ` ORDER BY h."createdAt" DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

export const getHomeworkByTeacher = async (pool, teacherId) => {
  const result = await pool.query(
    `SELECT * FROM homework WHERE "teacherId" = $1 ORDER BY "createdAt" DESC`,
    [teacherId]
  );
  return result.rows;
};

export const createHomework = async (pool, { teacherId, classLevel, section, title, description, dueDate, subject }) => {
  const result = await pool.query(
    `INSERT INTO homework (title, description, "classLevel", section, subject, "dueDate", "teacherId")
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, description || null, classLevel, section || null, subject || null, dueDate || null, teacherId || null]
  );
  return result.rows[0];
};

export const updateHomework = async (pool, id, { title, description, dueDate, subject }) => {
  const result = await pool.query(
    `UPDATE homework SET title=$1, description=$2, "dueDate"=$3, subject=$4 WHERE id=$5 RETURNING *`,
    [title, description || null, dueDate || null, subject || null, id]
  );
  return result.rows[0] || null;
};

export const deleteHomework = async (pool, id) => {
  await pool.query('DELETE FROM homework WHERE id = $1', [id]);
  return true;
};
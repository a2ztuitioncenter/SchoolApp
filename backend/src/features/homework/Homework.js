import db from '../../config/pool.js';

export const homeworkModel = {
  table: 'homework',
  schema: `
    CREATE TABLE IF NOT EXISTS homework (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER REFERENCES users(id),
      class_level VARCHAR(50) NOT NULL,
      section VARCHAR(10),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      due_date DATE,
      subject VARCHAR(100),
      attachment_url VARCHAR(500),
      school_id VARCHAR(50) DEFAULT 'school-001',
      type VARCHAR(50) DEFAULT 'homework',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,

  // Helper function to format database rows to camelCase for API response
  formatRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      teacherId: row.teacher_id,
      classLevel: row.class_level,
      section: row.section,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      subject: row.subject,
      attachmentUrl: row.attachment_url,
      schoolId: row.school_id,
      type: row.type,
      createdAt: row.created_at,
      teacherPhone: row.teacher_phone,
      assignedBy: row.teacher_id,
      assignedByName: row.assigned_by_name || 'Admin'
    };
  },

  async getAll(classLevel = '', section = '') {
    let query = `SELECT h.*, u.phone AS teacher_phone, u.name AS assigned_by_name
                 FROM homework h
                 LEFT JOIN users u ON h.teacher_id = u.id`;
    const params = [];
    if (classLevel) { 
      query += ` WHERE h.class_level = $1`; 
      params.push(classLevel); 
      if (section) {
        query += ` AND (h.section = $2 OR h.section = 'ALL')`;
        params.push(section);
      }
    } else if (section) {
      query += ` WHERE (h.section = $1 OR h.section = 'ALL')`;
      params.push(section);
    }
    query += ` ORDER BY h.created_at DESC`;
    const result = await db.query(query, params);
    return result.rows.map(row => this.formatRow(row));
  },

  async getByClass(classLevel) {
    return this.getAll(classLevel);
  },

  async getById(id) {
    const result = await db.query('SELECT * FROM homework WHERE id = $1', [id]);
    return this.formatRow(result.rows[0]);
  },

  async create({ title, description, classLevel, section, subject, dueDate, assignedBy, attachmentUrl }) {
    const result = await db.query(
      `INSERT INTO homework (title, description, class_level, section, subject, due_date, teacher_id, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description || null, classLevel, section || 'A', subject || null, dueDate || null, assignedBy || null, attachmentUrl || null]
    );
    return this.formatRow(result.rows[0]);
  },

  async update(id, { title, description, classLevel, section, subject, dueDate, attachmentUrl }) {
    const result = await db.query(
      `UPDATE homework SET title=$1, description=$2, class_level=$3, section=$4, subject=$5, due_date=$6, attachment_url=$7 WHERE id=$8 RETURNING *`,
      [title, description || null, classLevel, section || 'A', subject || null, dueDate || null, attachmentUrl || null, id]
    );
    return this.formatRow(result.rows[0]);
  },

  async delete(id) {
    const result = await db.query('DELETE FROM homework WHERE id=$1 RETURNING id', [id]);
    return result.rows[0] || null;
  }
};

// Legacy pool-based named exports used by teacherRoutes.js and studentRoutes.js
export const getHomeworkByClass = async (pool, classLevel, section = 'A', type = 'homework') => {
  let query = `SELECT h.*, u.phone AS teacher_phone
               FROM homework h
               LEFT JOIN users u ON h.teacher_id = u.id
               WHERE h.class_level = $1 AND h.type = $2 AND (h.section = $3 OR h.section = 'ALL')`;
  const params = [classLevel, type, section];
  query += ` ORDER BY h.created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

export const getHomeworkByTeacher = async (pool, teacherId) => {
  const result = await pool.query(
    `SELECT * FROM homework WHERE teacher_id = $1 ORDER BY created_at DESC`,
    [teacherId]
  );
  return result.rows;
};

export const createHomework = async (pool, { teacherId, classLevel, section, title, description, dueDate, subject, attachmentUrl, type = 'homework' }) => {
  const result = await pool.query(
    `INSERT INTO homework (title, description, class_level, section, subject, due_date, teacher_id, attachment_url, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [title, description || null, classLevel, section || null, subject || null, dueDate || null, teacherId || null, attachmentUrl || null, type]
  );
  return result.rows[0];
};

export const updateHomework = async (pool, id, { title, description, dueDate, subject, attachmentUrl, type = 'homework' }) => {
  const result = await pool.query(
    `UPDATE homework SET title=$1, description=$2, due_date=$3, subject=$4,
     attachment_url = COALESCE($5, attachment_url), type=$6 WHERE id=$7 RETURNING *`,
    [title, description || null, dueDate || null, subject || null, attachmentUrl || null, type, id]
  );
  return result.rows[0] || null;
};

export const deleteHomework = async (pool, id) => {
  await pool.query('DELETE FROM homework WHERE id = $1', [id]);
  return true;
};
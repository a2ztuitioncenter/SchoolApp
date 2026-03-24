import db from '../database.js';

export const homeworkModel = {
  table: 'homework',
  schema: `
    CREATE TABLE IF NOT EXISTS homework (
      id           SERIAL PRIMARY KEY,
      title        VARCHAR(200) NOT NULL,
      description  TEXT,
      class_name   VARCHAR(50) NOT NULL,
      subject      VARCHAR(100) NOT NULL,
      due_date     DATE,
      assigned_by  INTEGER REFERENCES users(id),
      created_at   TIMESTAMP DEFAULT NOW(),
      updated_at   TIMESTAMP DEFAULT NOW()
    );
  `,

  async create({ title, description, class_name, subject, due_date, assigned_by }) {
    const result = await db.query(
      `INSERT INTO homework (title, description, class_name, subject, due_date, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, class_name, subject, due_date, assigned_by]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await db.query(
      `SELECT h.*, u.name AS teacher_name
       FROM homework h
       LEFT JOIN users u ON h.assigned_by = u.id
       ORDER BY h.created_at DESC`
    );
    return result.rows;
  },

  async getByClass(class_name) {
    const result = await db.query(
      `SELECT h.*, u.name AS teacher_name
       FROM homework h
       LEFT JOIN users u ON h.assigned_by = u.id
       WHERE h.class_name = $1
       ORDER BY h.created_at DESC`,
      [class_name]
    );
    return result.rows;
  },

  async getById(id) {
    const result = await db.query(
      `SELECT h.*, u.name AS teacher_name
       FROM homework h
       LEFT JOIN users u ON h.assigned_by = u.id
       WHERE h.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async update(id, { title, description, class_name, subject, due_date }) {
    const result = await db.query(
      `UPDATE homework
       SET title=$1, description=$2, class_name=$3,
           subject=$4, due_date=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [title, description, class_name, subject, due_date, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await db.query(
      `DELETE FROM homework WHERE id=$1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  }
};

// Helper function for getting homework by class
export async function getHomeworkByClass(pool, classLevel, section = null) {
  try {
    let query = `
      SELECT h.*, u.name AS teacher_name
      FROM homework h
      LEFT JOIN users u ON h.assigned_by = u.id
      WHERE h.class_name = $1
    `;
    const params = [classLevel];
    
    if (section) {
      query += ` AND h.section = $2`;
      params.push(section);
    }
    
    query += ` ORDER BY h.due_date DESC, h.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching homework by class:', error);
    return [];
  }
}

// Helper function for getting homework by teacher
export async function getHomeworkByTeacher(pool, teacherId) {
  try {
    const result = await pool.query(
      `SELECT h.*, u.name AS teacher_name
       FROM homework h
       LEFT JOIN users u ON h.assigned_by = u.id
       WHERE h.assigned_by = $1
       ORDER BY h.due_date DESC, h.created_at DESC`,
      [teacherId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching homework by teacher:', error);
    return [];
  }
}

// Helper function for creating homework
export async function createHomework(pool, { title, description, class_name, subject, due_date, assigned_by }) {
  try {
    const result = await pool.query(
      `INSERT INTO homework (title, description, class_name, subject, due_date, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, class_name, subject, due_date, assigned_by]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating homework:', error);
    throw error;
  }
}

// Helper function for updating homework
export async function updateHomework(pool, id, { title, description, class_name, subject, due_date }) {
  try {
    const result = await pool.query(
      `UPDATE homework
       SET title=$1, description=$2, class_name=$3, subject=$4, due_date=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [title, description, class_name, subject, due_date, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating homework:', error);
    throw error;
  }
}

// Helper function for deleting homework
export async function deleteHomework(pool, id) {
  try {
    const result = await pool.query(
      `DELETE FROM homework WHERE id=$1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error deleting homework:', error);
    throw error;
  }
}
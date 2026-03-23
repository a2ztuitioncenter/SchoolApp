import db from '../database.js';

const Homework = {

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

export default Homework;
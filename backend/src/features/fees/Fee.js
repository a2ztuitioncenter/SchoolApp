import db from '../../config/pool.js';

export const feeModel = {
  table: 'fees',
  schema: `
    CREATE TABLE IF NOT EXISTS fees (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      amount DECIMAL(10, 2) NOT NULL,
      description VARCHAR(200),
      due_date DATE NOT NULL,
      is_paid BOOLEAN DEFAULT FALSE,
      paid_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      school_id VARCHAR(50) DEFAULT 'school-001',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  async addFee({ studentId, amount, description, dueDate }) {
    const result = await db.query(
      `INSERT INTO fees (student_id, user_id, amount, description, due_date) 
       VALUES ($1, (SELECT user_id FROM students WHERE id = $1), $2, $3, $4) RETURNING *`,
      [studentId, amount, description || null, dueDate]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await db.query(
      `SELECT f.*, f.is_paid AS paid, f.student_id, f.due_date,
              s.name AS student_name, s.class_level
       FROM fees f JOIN students s ON f.student_id = s.id
       ORDER BY f.due_date ASC`
    );
    return result.rows;
  },

  async getUnpaid() {
    const result = await db.query(
      `SELECT f.*, f.is_paid AS paid, f.student_id, f.due_date,
              s.name AS student_name, s.class_level
       FROM fees f JOIN students s ON f.student_id = s.id
       WHERE f.is_paid = FALSE
       ORDER BY f.due_date ASC`
    );
    return result.rows;
  },

  async getByStudent(studentId) {
    const result = await db.query(
      `SELECT f.*, f.is_paid AS paid, f.student_id, f.due_date,
              s.name AS student_name
       FROM fees f JOIN students s ON f.student_id = s.id
       WHERE f.student_id = $1 ORDER BY f.created_at DESC`,
      [studentId]
    );
    return result.rows;
  },

  async markPaid(feeId) {
    const result = await db.query(
      `UPDATE fees SET is_paid=TRUE, paid_date=CURRENT_DATE WHERE id=$1 RETURNING *`,
      [feeId]
    );
    return result.rows[0] || null;
  },

  async markUnpaid(feeId) {
    const result = await db.query(
      `UPDATE fees SET is_paid=FALSE, paid_date=NULL WHERE id=$1 RETURNING *`,
      [feeId]
    );
    return result.rows[0] || null;
  },

  async deleteFee(feeId) {
    const result = await db.query(`DELETE FROM fees WHERE id=$1 RETURNING id`, [feeId]);
    return result.rows[0] || null;
  },

  async getStats() {
    const result = await db.query(
      `SELECT
         COUNT(*) AS total_fees,
         COUNT(CASE WHEN is_paid=TRUE  THEN 1 END) AS paid_count,
         COUNT(CASE WHEN is_paid=FALSE THEN 1 END) AS unpaid_count,
         COALESCE(SUM(CASE WHEN is_paid=TRUE  THEN amount END), 0) AS total_collected,
         COALESCE(SUM(CASE WHEN is_paid=FALSE THEN amount END), 0) AS total_pending
       FROM fees`
    );
    return result.rows[0];
  }
};

// Legacy helper exports
export const getAllStudentFees = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT * FROM fees WHERE student_id = $1 ORDER BY created_at DESC`,
    [studentId]
  );
  return result.rows;
};

export const getFeesSummary = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT 
       COALESCE(SUM(amount), 0) AS total_amount,
       COALESCE(SUM(CASE WHEN is_paid=TRUE THEN amount ELSE 0 END), 0) AS total_paid,
       COALESCE(SUM(CASE WHEN is_paid=FALSE THEN amount ELSE 0 END), 0) AS total_pending,
       COUNT(CASE WHEN is_paid=FALSE THEN 1 END) AS pending_count,
       COUNT(CASE WHEN is_paid=TRUE THEN 1 END) AS paid_count
     FROM fees WHERE student_id = $1`,
    [studentId]
  );
  return result.rows[0] || { total_amount: 0, total_paid: 0, total_pending: 0, pending_count: 0, paid_count: 0 };
};

export const getPendingFees = async (pool) => {
  const result = await pool.query(
    `SELECT f.*, s.name AS student_name, s.class_level
     FROM fees f JOIN students s ON f.student_id = s.id
     WHERE f.is_paid = FALSE ORDER BY f.due_date ASC`
  );
  return result.rows;
};
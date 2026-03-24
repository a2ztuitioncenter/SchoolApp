import db from '../database.js';

export const feeModel = {
  table: 'fees',
  schema: `
    CREATE TABLE IF NOT EXISTS fees (
      id           SERIAL PRIMARY KEY,
      student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      amount       DECIMAL(10, 2) NOT NULL,
      description  VARCHAR(200),
      due_date     DATE NOT NULL,
      paid         BOOLEAN DEFAULT FALSE,
      paid_date    DATE,
      created_at   TIMESTAMP DEFAULT NOW()
    );
  `,

  async addFee({ student_id, amount, description, due_date }) {
    const result = await db.query(
      `INSERT INTO fees (student_id, amount, description, due_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, amount, description, due_date]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await db.query(
      `SELECT f.*, s.name AS student_name, s.class_level AS class_name
       FROM fees f
       JOIN students s ON f.student_id = s.id
       ORDER BY f.due_date ASC`
    );
    return result.rows;
  },

  async getUnpaid() {
    const result = await db.query(
      `SELECT f.*, s.name AS student_name, s.class_level AS class_name
       FROM fees f
       JOIN students s ON f.student_id = s.id
       WHERE f.paid = FALSE
       ORDER BY f.due_date ASC`
    );
    return result.rows;
  },

  async getByStudent(student_id) {
    const result = await db.query(
      `SELECT f.*, s.name AS student_name
       FROM fees f
       JOIN students s ON f.student_id = s.id
       WHERE f.student_id = $1
       ORDER BY f.created_at DESC`,
      [student_id]
    );
    return result.rows;
  },

  async markPaid(fee_id) {
    const result = await db.query(
      `UPDATE fees SET paid=TRUE, paid_date=CURRENT_DATE
       WHERE id=$1 RETURNING *`,
      [fee_id]
    );
    return result.rows[0] || null;
  },

  async markUnpaid(fee_id) {
    const result = await db.query(
      `UPDATE fees SET paid=FALSE, paid_date=NULL
       WHERE id=$1 RETURNING *`,
      [fee_id]
    );
    return result.rows[0] || null;
  },

  async deleteFee(fee_id) {
    const result = await db.query(
      `DELETE FROM fees WHERE id=$1 RETURNING id`,
      [fee_id]
    );
    return result.rows[0] || null;
  },

  async getStats() {
    const result = await db.query(
      `SELECT
         COUNT(*)                                                  AS total_fees,
         COUNT(CASE WHEN paid=TRUE  THEN 1 END)                   AS paid_count,
         COUNT(CASE WHEN paid=FALSE THEN 1 END)                   AS unpaid_count,
         COALESCE(SUM(CASE WHEN paid=TRUE  THEN amount END), 0)   AS total_collected,
         COALESCE(SUM(CASE WHEN paid=FALSE THEN amount END), 0)   AS total_pending
       FROM fees`
    );
    return result.rows[0];
  }

};

// Helper functions for fee analytics
export async function getTotalPendingAmount(pool, student_id) {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalPending
       FROM fees
       WHERE student_id = $1 AND paid = FALSE`,
      [student_id]
    );
    return result.rows[0]?.totalPending || 0;
  } catch (error) {
    console.error('Error fetching total pending amount:', error);
    return 0;
  }
}

export async function getAllStudentFees(pool, student_id) {
  try {
    const result = await pool.query(
      `SELECT * FROM fees
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [student_id]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching all student fees:', error);
    return [];
  }
}

export async function getPendingFees(pool) {
  try {
    const result = await pool.query(
      `SELECT f.*, s.name AS student_name, s.class_level AS class_name
       FROM fees f
       JOIN students s ON f.student_id = s.id
       WHERE f.paid = FALSE
       ORDER BY f.due_date ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching pending fees:', error);
    return [];
  }
}

export async function getFeesSummary(pool, student_id) {
  try {
    const result = await pool.query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS totalAmount,
         COALESCE(SUM(CASE WHEN paid = TRUE THEN amount ELSE 0 END), 0) AS totalPaid,
         COALESCE(SUM(CASE WHEN paid = FALSE THEN amount ELSE 0 END), 0) AS totalPending,
         COUNT(CASE WHEN paid = FALSE THEN 1 END) AS pendingCount,
         COUNT(CASE WHEN paid = TRUE THEN 1 END) AS paidCount
       FROM fees
       WHERE student_id = $1`,
      [student_id]
    );
    return result.rows[0] || { totalAmount: 0, totalPaid: 0, totalPending: 0, pendingCount: 0, paidCount: 0 };
  } catch (error) {
    console.error('Error fetching fees summary:', error);
    return { totalAmount: 0, totalPaid: 0, totalPending: 0, pendingCount: 0, paidCount: 0 };
  }
}
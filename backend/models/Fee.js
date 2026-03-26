import db from '../pool.js';

export const feeModel = {
  table: 'fees',

  async addFee({ studentId, amount, description, dueDate }) {
    const result = await db.query(
      `INSERT INTO fees ("studentId", "userId", amount, description, "dueDate") 
       VALUES ($1, (SELECT "userId" FROM students WHERE id = $1), $2, $3, $4) RETURNING *`,
      [studentId, amount, description || null, dueDate]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await db.query(
      `SELECT f.*, f.paid, f."studentId" AS student_id, f."dueDate" AS due_date,
              s.name AS "studentName", s."classLevel"
       FROM fees f JOIN students s ON f."studentId" = s.id
       ORDER BY f."dueDate" ASC`
    );
    return result.rows;
  },

  async getUnpaid() {
    const result = await db.query(
      `SELECT f.*, f.paid, f."studentId" AS student_id, f."dueDate" AS due_date,
              s.name AS "studentName", s."classLevel"
       FROM fees f JOIN students s ON f."studentId" = s.id
       WHERE f.paid = FALSE
       ORDER BY f."dueDate" ASC`
    );
    return result.rows;
  },

  async getByStudent(studentId) {
    const result = await db.query(
      `SELECT f.*, f.paid, f."studentId" AS student_id, f."dueDate" AS due_date,
              s.name AS "studentName"
       FROM fees f JOIN students s ON f."studentId" = s.id
       WHERE f."studentId" = $1 ORDER BY f."createdAt" DESC`,
      [studentId]
    );
    return result.rows;
  },

  async markPaid(feeId) {
    const result = await db.query(
      `UPDATE fees SET paid=TRUE, "paidDate"=CURRENT_DATE, status='paid' WHERE id=$1 RETURNING *`,
      [feeId]
    );
    return result.rows[0] || null;
  },

  async markUnpaid(feeId) {
    const result = await db.query(
      `UPDATE fees SET paid=FALSE, "paidDate"=NULL, status='pending' WHERE id=$1 RETURNING *`,
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
         COUNT(*) AS "totalFees",
         COUNT(CASE WHEN paid=TRUE  THEN 1 END) AS "paidCount",
         COUNT(CASE WHEN paid=FALSE THEN 1 END) AS "unpaidCount",
         COALESCE(SUM(CASE WHEN paid=TRUE  THEN amount END), 0) AS "totalCollected",
         COALESCE(SUM(CASE WHEN paid=FALSE THEN amount END), 0) AS "totalPending"
       FROM fees`
    );
    return result.rows[0];
  }
};

// Legacy helper exports for dataController.js / adminRoutes.js
export const getAllStudentFees = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT * FROM fees WHERE "studentId" = $1 ORDER BY "createdAt" DESC`,
    [studentId]
  );
  return result.rows;
};

export const getFeesSummary = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT 
       COALESCE(SUM(amount), 0) AS "totalAmount",
       COALESCE(SUM(CASE WHEN paid=TRUE THEN amount ELSE 0 END), 0) AS "totalPaid",
       COALESCE(SUM(CASE WHEN paid=FALSE THEN amount ELSE 0 END), 0) AS "totalPending",
       COUNT(CASE WHEN paid=FALSE THEN 1 END) AS "pendingCount",
       COUNT(CASE WHEN paid=TRUE THEN 1 END) AS "paidCount"
     FROM fees WHERE "studentId" = $1`,
    [studentId]
  );
  return result.rows[0] || { totalAmount: 0, totalPaid: 0, totalPending: 0, pendingCount: 0, paidCount: 0 };
};

export const getPendingFees = async (pool) => {
  const result = await pool.query(
    `SELECT f.*, s.name AS "studentName", s."classLevel"
     FROM fees f JOIN students s ON f."studentId" = s.id
     WHERE f.paid = FALSE ORDER BY f."dueDate" ASC`
  );
  return result.rows;
};
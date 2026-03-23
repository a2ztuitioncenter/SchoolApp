import db from '../database.js';

const Fee = {

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
      `SELECT f.*, s.name AS student_name, s.class_name, s.roll_number
       FROM fees f
       JOIN students s ON f.student_id = s.id
       ORDER BY f.due_date ASC`
    );
    return result.rows;
  },

  async getUnpaid() {
    const result = await db.query(
      `SELECT f.*, s.name AS student_name, s.class_name, s.roll_number
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

export default Fee;
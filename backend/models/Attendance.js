import db from '../database.js';

const Attendance = {

  async markAttendance({ student_id, class_name, date, status, marked_by }) {
    const result = await db.query(
      `INSERT INTO attendance (student_id, class_name, date, status, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, date)
       DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by
       RETURNING *`,
      [student_id, class_name, date, status, marked_by]
    );
    return result.rows[0];
  },

  async markBulk(records, marked_by) {
    const results = [];
    for (const rec of records) {
      const r = await db.query(
        `INSERT INTO attendance (student_id, class_name, date, status, marked_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by
         RETURNING *`,
        [rec.student_id, rec.class_name, rec.date, rec.status, marked_by]
      );
      results.push(r.rows[0]);
    }
    return results;
  },

  async getByClassAndDate(class_name, date) {
    const result = await db.query(
      `SELECT a.*, s.name AS student_name, s.roll_number
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.class_name = $1 AND a.date = $2
       ORDER BY s.name`,
      [class_name, date]
    );
    return result.rows;
  },

  async getStudentsByClass(class_name) {
    const result = await db.query(
      `SELECT id, name, roll_number FROM students
       WHERE class_name = $1 ORDER BY name`,
      [class_name]
    );
    return result.rows;
  },

  async getByStudent(student_id) {
    const result = await db.query(
      `SELECT * FROM attendance
       WHERE student_id = $1 ORDER BY date DESC`,
      [student_id]
    );
    return result.rows;
  },

  async getMonthlySummary(class_name, month) {
    const result = await db.query(
      `SELECT
         s.id, s.name, s.roll_number,
         COUNT(a.id)                                        AS total_days,
         COUNT(CASE WHEN a.status='present' THEN 1 END)    AS present_count,
         COUNT(CASE WHEN a.status='absent'  THEN 1 END)    AS absent_count,
         COUNT(CASE WHEN a.status='late'    THEN 1 END)    AS late_count,
         ROUND(
           COUNT(CASE WHEN a.status='present' THEN 1 END) * 100.0
           / NULLIF(COUNT(a.id), 0), 1
         ) AS attendance_percent
       FROM students s
       LEFT JOIN attendance a
         ON s.id = a.student_id
         AND TO_CHAR(a.date, 'YYYY-MM') = $2
       WHERE s.class_name = $1
       GROUP BY s.id, s.name, s.roll_number
       ORDER BY s.name`,
      [class_name, month]
    );
    return result.rows;
  },

  async getAllClasses() {
    const result = await db.query(
      `SELECT DISTINCT class_name FROM students ORDER BY class_name`
    );
    return result.rows.map(r => r.class_name);
  }

};

export default Attendance;
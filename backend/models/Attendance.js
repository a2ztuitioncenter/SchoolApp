import db from '../database.js';

export const attendanceModel = {
  table: 'attendance',
  schema: `
    CREATE TABLE IF NOT EXISTS attendance (
      id           SERIAL PRIMARY KEY,
      student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_name   VARCHAR(50) NOT NULL,
      date         DATE NOT NULL,
      status       VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
      marked_by    INTEGER REFERENCES users(id),
      created_at   TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, date)
    );
  `,

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
      `SELECT a.*, s.name AS student_name, NULL AS roll_number
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
      `SELECT id, name, NULL AS roll_number FROM students
       WHERE class_level = $1 ORDER BY name`,
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
         s.id, s.name, NULL AS roll_number,
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
       WHERE s.class_level = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [class_name, month]
    );
    return result.rows;
  },

  async getAllClasses() {
    const result = await db.query(
      `SELECT DISTINCT class_level AS class_name FROM students ORDER BY class_level`
    );
    return result.rows.map(r => r.class_name);
  }
};

// Helper functions for attendance analytics
export async function getAttendancePercentage(pool, student_id, days = 30) {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(CASE WHEN status = 'present' THEN 1 END) AS presentDays,
         COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absentDays,
         COUNT(*) AS totalWorkingDays,
         ROUND(
           COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / 
           NULLIF(COUNT(*), 0), 1
         ) AS percentage
       FROM attendance
       WHERE student_id = $1 AND date >= NOW() - INTERVAL '${days} days'`,
      [student_id]
    );
    return result.rows[0] || { presentDays: 0, absentDays: 0, totalWorkingDays: 0, percentage: 0 };
  } catch (error) {
    console.error('Error fetching attendance percentage:', error);
    return { presentDays: 0, absentDays: 0, totalWorkingDays: 0, percentage: 0 };
  }
}

export async function getAttendanceSummary(pool, student_id) {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(CASE WHEN status = 'present' THEN 1 END) AS present,
         COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absent,
         COUNT(CASE WHEN status = 'late' THEN 1 END) AS late,
         COUNT(*) AS total
       FROM attendance
       WHERE student_id = $1`,
      [student_id]
    );
    return result.rows[0] || { present: 0, absent: 0, late: 0, total: 0 };
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return { present: 0, absent: 0, late: 0, total: 0 };
  }
}

export async function getAttendanceByStudentId(pool, student_id, startDate = null, endDate = null) {
  try {
    let query = `SELECT * FROM attendance WHERE student_id = $1`;
    const params = [student_id];
    
    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY date DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching attendance by student:', error);
    return [];
  }
}
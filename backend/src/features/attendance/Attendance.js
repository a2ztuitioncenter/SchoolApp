import db from '../../config/pool.js';

export const attendanceModel = {
  table: 'attendance',
  schema: `
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      class_level VARCHAR(50) NOT NULL,
      section VARCHAR(10) DEFAULT 'A',
      date DATE NOT NULL,
      is_present BOOLEAN NOT NULL DEFAULT TRUE,
      school_id VARCHAR(50) DEFAULT 'school-001',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, date)
    );
  `,

  async markBulk(records, userId) {
    const results = [];
    for (const rec of records) {
      const studentId = rec.studentId || rec.student_id;
      const date = rec.date || rec.attendanceDate;
      const classLevel = rec.classLevel || rec.class_level;
      const section = rec.section || null;
      const isPresent = (rec.isPresent === true || rec.isPresent === 'true' || rec.is_present === true || rec.is_present === 'true' || rec.status === 'present' || rec.status === 'true' || rec.status === true);

      const r = await db.query(
       const r = await db.query(
        `INSERT INTO attendance (student_id, class_level, section, date, is_present, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, date)
         DO UPDATE SET is_present = EXCLUDED.is_present, class_level = EXCLUDED.class_level, section = EXCLUDED.section
         RETURNING *`,
        [studentId, classLevel, section, date, isPresent, userId]
      );         ON CONFLICT(student_id, date)
         DO UPDATE SET is_present = EXCLUDED.is_present, class_level = EXCLUDED.class_level, section = EXCLUDED.section
      RETURNING * `,
        [studentId, classLevel, section, date, isPresent]
      );
      results.push(r.rows[0]);
    }
    return results;
  },

  async getByClassAndDate(classLevel, date, section = null) {
    const result = await db.query(
      `SELECT a.*, s.name AS student_name, s.roll_number AS "rollNumber"
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.class_level = $1 AND s.section = $2 AND a.date = $3
       ORDER BY s.name`,
      [classLevel, section, date]
    );
    return result.rows;
  },

  async getStudentsByClass(classLevel, section = 'A') {
    const result = await db.query(
      `SELECT id, name, roll_number AS "rollNumber" FROM students WHERE class_level = $1 AND section = $2 ORDER BY name`,
      [classLevel, section]
    );
    return result.rows;
  },

  async getByStudent(studentId) {
    return (await db.query(`SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC`, [studentId])).rows;
  },

  async getMonthlySummary(classLevel, month, section = 'A') {
    const result = await db.query(
      `SELECT
      s.id, s.name, s.roll_number AS "rollNumber",
        COUNT(a.id)                                         AS total_days,
          COUNT(CASE WHEN a.is_present = true  THEN 1 END)     AS present_count,
            COUNT(CASE WHEN a.is_present = false THEN 1 END)     AS absent_count,
              ROUND(COUNT(CASE WHEN a.is_present = true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1) AS attendance_percent
      FROM students s
      LEFT JOIN attendance a
        ON s.id = a.student_id
        AND TO_CHAR(a.date, 'YYYY-MM') = $2
      WHERE s.class_level = $1 AND s.section = $3
      GROUP BY s.id, s.name, s.roll_number
      ORDER BY s.name`,
     [classLevel, month, section]
    );
    return result.rows;
  },

  async getMonthlyOverallAttendance(month = null) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const result = await db.query(
      `SELECT
      COUNT(DISTINCT student_id) AS total_students,
        COUNT(id) AS total_records,
          COUNT(CASE WHEN is_present = true THEN 1 END) AS present_count,
            COUNT(CASE WHEN is_present = false THEN 1 END) AS absent_count,
              ROUND(COUNT(CASE WHEN is_present = true THEN 1 END) * 100.0 / NULLIF(COUNT(id), 0), 1) AS attendance_percent
       FROM attendance
       WHERE TO_CHAR(date, 'YYYY-MM') = $1`,
      [targetMonth]
    );
    return result.rows[0] || { total_students: 0, total_records: 0, present_count: 0, absent_count: 0, attendance_percent: 0 };
  },

  async getAllClasses() {
    return (await db.query(`SELECT DISTINCT class_level FROM students ORDER BY class_level`)).rows.map(r => r.class_level);
  },

  async getSectionsByClass(classLevel) {
    return (await db.query(`SELECT DISTINCT section FROM students WHERE class_level = $1 AND section IS NOT NULL ORDER BY section`, [classLevel])).rows.map(r => r.section);
  }
};

// Simplified Helpers
export const getAttendancePercentage = async (pool, studentId, days = 30) => {
  try {
    const result = await pool.query(
      `SELECT
      COUNT(CASE WHEN is_present = true THEN 1 END) AS present_days,
        COUNT(*) AS total_days,
          ROUND(COUNT(CASE WHEN is_present = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS percentage
        FROM attendance
        WHERE student_id = $1 AND date >= NOW() - make_interval(days => $2)`,
      [studentId, parseInt(days, 10) || 30]
    );
    const row = result.rows[0];
    return row ? { 
      presentDays: parseInt(row.present_days), 
      totalDays: parseInt(row.total_days), 
      percentage: parseFloat(row.percentage) || 0
    } : { presentDays: 0, totalDays: 0, percentage: 0 };
  } catch (err) {
    return { presentDays: 0, totalDays: 0, percentage: 0 };
  }
};

export const getAttendanceSummary = async (pool, studentId) => {
  try {
    const result = await pool.query(
      `SELECT
      COUNT(CASE WHEN is_present = true THEN 1 END) AS present,
        COUNT(CASE WHEN is_present = false THEN 1 END) AS absent,
          COUNT(*) AS total
       FROM attendance WHERE student_id = $1`,
      [studentId]
    );
    return result.rows[0] || { present: 0, absent: 0, total: 0 };
  } catch (err) {
    return { present: 0, absent: 0, total: 0 };
  }
};

export const getAttendanceByStudentId = async (pool, studentId, startDate = null, endDate = null) => {
  try {
    const params = [studentId];
    let query = `SELECT * FROM attendance WHERE student_id = $1`;
    if (startDate) { query += ` AND date >= $${ params.length + 1 } `; params.push(startDate); }
    if (endDate) { query += ` AND date <= $${ params.length + 1 } `; params.push(endDate); }
    query += ` ORDER BY date DESC`;
    return (await pool.query(query, params)).rows;
  } catch (err) {
    return [];
  }
};

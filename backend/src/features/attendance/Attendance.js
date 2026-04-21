import db from '../../config/pool.js';

export const attendanceModel = {
  table: 'attendance',
  schema: `
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      "studentId" INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      "userId" INTEGER REFERENCES users(id),
      "classLevel" VARCHAR(50) NOT NULL,
      section VARCHAR(10) DEFAULT 'A',
      date DATE NOT NULL,
      "isPresent" BOOLEAN NOT NULL DEFAULT TRUE,
      "schoolId" VARCHAR(50) DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("studentId", date)
    );
  `,

  async markBulk(records, userId) {
    const results = [];
    for (const rec of records) {
      const studentId = rec.studentId || rec.student_id;
      const date = rec.date || rec.attendanceDate;
      const classLevel = rec.classLevel || rec.class_level;
      const section = rec.section || 'A';
      const isPresent = (rec.isPresent === true || rec.isPresent === 'true' || rec.is_present === true || rec.is_present === 'true' || rec.status === 'present' || rec.status === 'true' || rec.status === true);

      const r = await db.query(
        `INSERT INTO attendance ("studentId", "classLevel", section, date, "isPresent", "userId")
         VALUES ($1, $2, $3, $4, $5, (SELECT "userId" FROM students WHERE id = $1))
         ON CONFLICT ("studentId", date)
         DO UPDATE SET "isPresent" = EXCLUDED."isPresent", "classLevel" = EXCLUDED."classLevel", section = EXCLUDED.section
         RETURNING *`,
        [studentId, classLevel, section, date, isPresent]
      );
      results.push(r.rows[0]);
    }
    return results;
  },

  async getByClassAndDate(classLevel, date, section = 'A') {
    const result = await db.query(
      `SELECT a.*, s.name AS "studentName", s."rollNumber"
       FROM attendance a
       JOIN students s ON a."studentId" = s.id
       WHERE s."classLevel" = $1 AND s.section = $2 AND a.date = $3
       ORDER BY s.name`,
      [classLevel, section, date]
    );
    return result.rows;
  },

  async getStudentsByClass(classLevel, section = 'A') {
    const result = await db.query(
      `SELECT id, name, "rollNumber" FROM students WHERE "classLevel" = $1 AND section = $2 ORDER BY name`,
      [classLevel, section]
    );
    return result.rows;
  },

  async getByStudent(studentId) {
    return (await db.query(`SELECT * FROM attendance WHERE "studentId" = $1 ORDER BY date DESC`, [studentId])).rows;
  },

  async getMonthlySummary(classLevel, month, section = 'A') {
    const result = await db.query(
      `SELECT
         s.id, s.name, s."rollNumber",
        COUNT(a.id)                                         AS total_days,
        COUNT(CASE WHEN a."isPresent"=true  THEN 1 END)     AS present_count,
        COUNT(CASE WHEN a."isPresent"=false THEN 1 END)     AS absent_count,
        ROUND(COUNT(CASE WHEN a."isPresent"=true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1) AS attendance_percent
      FROM students s
      LEFT JOIN attendance a
        ON s.id = a."studentId"
        AND TO_CHAR(a.date, 'YYYY-MM') = $2
      WHERE s."classLevel" = $1 AND s.section = $3
      GROUP BY s.id, s.name, s."rollNumber"
      ORDER BY s.name`,
     [classLevel, month, section]
    );
    return result.rows;
  },

  async getMonthlyOverallAttendance(month = null) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const result = await db.query(
      `SELECT
         COUNT(DISTINCT "studentId") AS total_students,
         COUNT(id) AS total_records,
         COUNT(CASE WHEN "isPresent"=true THEN 1 END) AS present_count,
         COUNT(CASE WHEN "isPresent"=false THEN 1 END) AS absent_count,
         ROUND(COUNT(CASE WHEN "isPresent"=true THEN 1 END) * 100.0 / NULLIF(COUNT(id), 0), 1) AS attendance_percent
       FROM attendance
       WHERE TO_CHAR(date, 'YYYY-MM') = $1`,
      [targetMonth]
    );
    return result.rows[0] || { total_students: 0, total_records: 0, present_count: 0, absent_count: 0, attendance_percent: 0 };
  },

  async getAllClasses() {
    return (await db.query(`SELECT DISTINCT "classLevel" AS class_level FROM students ORDER BY class_level`)).rows;
  },

  async getSectionsByClass(classLevel) {
    const { sanitizeIdentifier } = await import('../../utils/sanitize.js');
    return (await db.query(`SELECT DISTINCT section FROM students WHERE "classLevel" = $1 AND section IS NOT NULL ORDER BY section`, [sanitizeIdentifier(classLevel)])).rows.map(r => r.section);
  }
};

// Simplified Helpers
export const getAttendancePercentage = async (pool, studentId, days = 30) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(CASE WHEN "isPresent" = true THEN 1 END) AS "presentDays",
         COUNT(*) AS "totalDays",
         ROUND(COUNT(CASE WHEN "isPresent" = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS percentage
        FROM attendance
        WHERE "studentId" = $1 AND date >= NOW() - INTERVAL '${days} days'`,
      [studentId]
    );
    return result.rows[0] || { presentDays: 0, totalDays: 0, percentage: 0 };
  } catch (err) {
    return { presentDays: 0, totalDays: 0, percentage: 0 };
  }
};

export const getAttendanceSummary = async (pool, studentId) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(CASE WHEN "isPresent" = true THEN 1 END) AS present,
         COUNT(CASE WHEN "isPresent" = false THEN 1 END) AS absent,
         COUNT(*) AS total
       FROM attendance WHERE "studentId" = $1`,
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
    let query = `SELECT * FROM attendance WHERE "studentId" = $1`;
    if (startDate) { query += ` AND date >= $${params.length + 1}`; params.push(startDate); }
    if (endDate) { query += ` AND date <= $${params.length + 1}`; params.push(endDate); }
    query += ` ORDER BY date DESC`;
    return (await pool.query(query, params)).rows;
  } catch (err) {
    return [];
  }
};
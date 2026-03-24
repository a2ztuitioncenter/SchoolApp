import db from '../pool.js';

export const attendanceModel = {
  table: 'attendance',
  schema: `
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      "studentId" INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      "userId" INTEGER REFERENCES users(id),
      "attendanceDate" DATE NOT NULL,
      status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
      remarks TEXT,
      "schoolId" VARCHAR(50) DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("studentId", "attendanceDate")
    );
  `,

  async markBulk(records, userId) {
    const results = [];
    for (const rec of records) {
      const studentId = rec.studentId || rec.student_id;
      const date = rec.date || rec.attendanceDate;
      const r = await db.query(
        `INSERT INTO attendance ("studentId", "attendanceDate", status, "userId")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("studentId", "attendanceDate")
         DO UPDATE SET status = EXCLUDED.status, "userId" = EXCLUDED."userId"
         RETURNING *`,
        [studentId, date, rec.status, userId]
      );
      results.push(r.rows[0]);
    }
    return results;
  },

  async getByClassAndDate(classLevel, date) {
    // attendance has no classLevel column — join via students
    const result = await db.query(
      `SELECT a.*, s.name AS "studentName", s."rollNumber"
       FROM attendance a
       JOIN students s ON a."studentId" = s.id
       WHERE s."classLevel" = $1 AND a."attendanceDate" = $2
       ORDER BY s.name`,
      [classLevel, date]
    );
    return result.rows;
  },

  async getStudentsByClass(classLevel) {
    const result = await db.query(
      `SELECT id, name, "rollNumber" FROM students WHERE "classLevel" = $1 ORDER BY name`,
      [classLevel]
    );
    return result.rows;
  },

  async getByStudent(studentId) {
    const result = await db.query(
      `SELECT * FROM attendance WHERE "studentId" = $1 ORDER BY "attendanceDate" DESC`,
      [studentId]
    );
    return result.rows;
  },

  async getMonthlySummary(classLevel, month) {
    const result = await db.query(
      `SELECT
         s.id, s.name, s."rollNumber",
         COUNT(a.id)                                         AS "totalDays",
         COUNT(CASE WHEN a.status='present' THEN 1 END)     AS "presentCount",
         COUNT(CASE WHEN a.status='absent'  THEN 1 END)     AS "absentCount",
         COUNT(CASE WHEN a.status='late'    THEN 1 END)     AS "lateCount",
         ROUND(COUNT(CASE WHEN a.status='present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1) AS "attendancePercent"
       FROM students s
       LEFT JOIN attendance a
         ON s.id = a."studentId"
         AND TO_CHAR(a."attendanceDate", 'YYYY-MM') = $2
       WHERE s."classLevel" = $1
       GROUP BY s.id, s.name, s."rollNumber"
       ORDER BY s.name`,
      [classLevel, month]
    );
    return result.rows;
  },

  async getAllClasses() {
    const result = await db.query(
      `SELECT DISTINCT "classLevel" FROM students ORDER BY "classLevel"`
    );
    return result.rows.map(r => r.classLevel);
  }
};

// Legacy helper exports for dataController.js
export const getAttendancePercentage = async (pool, studentId, days = 30) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(CASE WHEN status = 'present' THEN 1 END) AS "presentDays",
         COUNT(CASE WHEN status = 'absent' THEN 1 END) AS "absentDays",
         COUNT(*) AS "totalWorkingDays",
         ROUND(COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS percentage
       FROM attendance
       WHERE "studentId" = $1 AND "attendanceDate" >= NOW() - INTERVAL '${days} days'`,
      [studentId]
    );
    return result.rows[0] || { presentDays: 0, absentDays: 0, totalWorkingDays: 0, percentage: 0 };
  } catch (err) {
    return { presentDays: 0, absentDays: 0, totalWorkingDays: 0, percentage: 0 };
  }
};

export const getAttendanceSummary = async (pool, studentId) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(CASE WHEN status = 'present' THEN 1 END) AS present,
         COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absent,
         COUNT(CASE WHEN status = 'late' THEN 1 END) AS late,
         COUNT(*) AS total
       FROM attendance WHERE "studentId" = $1`,
      [studentId]
    );
    return result.rows[0] || { present: 0, absent: 0, late: 0, total: 0 };
  } catch (err) {
    return { present: 0, absent: 0, late: 0, total: 0 };
  }
};

export const getAttendanceByStudentId = async (pool, studentId, startDate = null, endDate = null) => {
  try {
    let query = `SELECT * FROM attendance WHERE "studentId" = $1`;
    const params = [studentId];
    if (startDate) { query += ` AND "attendanceDate" >= $${params.length + 1}`; params.push(startDate); }
    if (endDate) { query += ` AND "attendanceDate" <= $${params.length + 1}`; params.push(endDate); }
    query += ` ORDER BY "attendanceDate" DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    return [];
  }
};
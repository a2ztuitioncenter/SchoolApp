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

  async markBulk(records, userId, schoolId) {
    const results = [];
    for (const rec of records) {
      const studentId = rec.studentId || rec.student_id;
      const date = rec.date || rec.attendanceDate;
      const classLevel = rec.classLevel || rec.class_level;
      const section = rec.section || null;
      const isPresent = (rec.isPresent === true || rec.isPresent === 'true' || rec.is_present === true || rec.is_present === 'true' || rec.status === 'present' || rec.status === 'true' || rec.status === true);

      const r = await db.query(
        `INSERT INTO attendance (student_id, class_level, section, date, is_present, user_id, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, date)
         DO UPDATE SET is_present = EXCLUDED.is_present, class_level = EXCLUDED.class_level, section = EXCLUDED.section
         RETURNING *`,
        [studentId, classLevel, section, date, isPresent, userId, schoolId]
      );
      results.push(r.rows[0]);
    }
    return results;
  },

  async getByClassAndDate(classLevel, date, section = null, schoolId) {
    const result = await db.query(
      `SELECT a.*, s.name AS student_name, s.roll_number AS "rollNumber"
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.class_level = $1 AND s.section = $2 AND a.date = $3 AND a.school_id = $4
       ORDER BY s.name`,
      [classLevel, section, date, schoolId]
    );
    return result.rows;
  },

  async getStudentsByClass(classLevel, section = 'A', schoolId) {
    const result = await db.query(
      `SELECT id, name, roll_number AS "rollNumber" FROM students WHERE class_level = $1 AND section = $2 AND school_id = $3 ORDER BY name`,
      [classLevel, section, schoolId]
    );
    return result.rows;
  },

  async getByStudent(studentId, schoolId) {
    return (await db.query(`SELECT * FROM attendance WHERE student_id = $1 AND school_id = $2 ORDER BY date DESC`, [studentId, schoolId])).rows;
  },

  async getMonthlySummary(classLevel, month, section = 'A', schoolId) {
    const result = await db.query(
      `SELECT
      s.id, s.name, s.roll_number AS "rollNumber",
        COUNT(a.id)                                         AS "totalDays",
          COUNT(CASE WHEN a.is_present = true  THEN 1 END)     AS "presentCount",
            COUNT(CASE WHEN a.is_present = false THEN 1 END)     AS "absentCount",
              ROUND(COUNT(CASE WHEN a.is_present = true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1) AS "attendancePercent"
      FROM students s
      LEFT JOIN attendance a
        ON s.id = a.student_id
        AND TO_CHAR(a.date, 'YYYY-MM') = $2
        AND a.school_id = $4
      WHERE s.class_level = $1 AND s.section = $3 AND s.school_id = $4
      GROUP BY s.id, s.name, s.roll_number
      ORDER BY s.name`,
      [classLevel, month, section, schoolId]
    );
    return result.rows;
  },

  async getMonthlyOverallAttendance(month = null, schoolId) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const result = await db.query(
      `SELECT
      COUNT(DISTINCT student_id) AS total_students,
        COUNT(id) AS total_records,
          COUNT(CASE WHEN is_present = true THEN 1 END) AS present_count,
            COUNT(CASE WHEN is_present = false THEN 1 END) AS absent_count,
              ROUND(COUNT(CASE WHEN is_present = true THEN 1 END) * 100.0 / NULLIF(COUNT(id), 0), 1) AS attendance_percent
       FROM attendance
       WHERE TO_CHAR(date, 'YYYY-MM') = $1 AND school_id = $2`,
      [targetMonth, schoolId]
    );
    return result.rows[0] || { total_students: 0, total_records: 0, present_count: 0, absent_count: 0, attendance_percent: 0 };
  },

  async getAllClasses(schoolId) {
    const result = await db.query(`SELECT DISTINCT class_level FROM students WHERE school_id = $1 ORDER BY class_level`, [schoolId]);
    const dbClasses = result.rows.map(r => r.class_level);
    const defaultClasses = ['7', '8', '9', '10', '11', '12'];

    return [...new Set([...defaultClasses, ...dbClasses])]
      .sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
        return numA - numB;
      });
  },

  async getSectionsByClass(classLevel, schoolId) {
    return (await db.query(`SELECT DISTINCT section FROM students WHERE class_level = $1 AND section IS NOT NULL AND school_id = $2 ORDER BY section`, [classLevel, schoolId])).rows.map(r => r.section);
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
    if (startDate) { query += ` AND date >= $${params.length + 1} `; params.push(startDate); }
    if (endDate) { query += ` AND date <= $${params.length + 1} `; params.push(endDate); }
    query += ` ORDER BY date DESC`;
    return (await pool.query(query, params)).rows;
  } catch (err) {
    return [];
  }
};

// Attendance.js - Attendance model for tracking student attendance
export const attendanceModel = {
  table: 'attendance',
  schema: `
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      "studentId" INT NOT NULL,
      "userId" INT NOT NULL,
      "attendanceDate" DATE NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
      remarks TEXT,
      "schoolId" VARCHAR(50) NOT NULL DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_studentId ON attendance("studentId");
    CREATE INDEX IF NOT EXISTS idx_attendance_userId ON attendance("userId");
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance("attendanceDate");
    CREATE INDEX IF NOT EXISTS idx_attendance_schoolId ON attendance("schoolId");
  `,
};

// Helper to get attendance records for a student
export const getAttendanceByStudentId = async (pool, studentId, startDate = null, endDate = null) => {
  try {
    let query = 'SELECT * FROM attendance WHERE "studentId" = $1';
    const params = [studentId];

    if (startDate) {
      query += ` AND "attendanceDate" >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND "attendanceDate" <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ' ORDER BY "attendanceDate" DESC';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    throw error;
  }
};

// Helper to calculate attendance percentage
export const getAttendancePercentage = async (pool, studentId, totalWorkingDays = 30) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as "presentDays" FROM attendance 
       WHERE "studentId" = $1 AND status = 'present'`,
      [studentId]
    );

    const presentDays = parseInt(result.rows[0].presentDays) || 0;
    const percentage = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

    return {
      presentDays,
      totalWorkingDays,
      absentDays: totalWorkingDays - presentDays,
      percentage,
    };
  } catch (error) {
    console.error('Error calculating attendance percentage:', error);
    throw error;
  }
};

// Helper to get attendance summary
export const getAttendanceSummary = async (pool, studentId) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) as count FROM attendance 
       WHERE "studentId" = $1 
       GROUP BY status`,
      [studentId]
    );

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
    };

    result.rows.forEach((row) => {
      summary[row.status] = parseInt(row.count) || 0;
    });

    return summary;
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    throw error;
  }
};

// Helper to create attendance record
export const createAttendance = async (pool, attendanceData) => {
  const {
    studentId,
    userId,
    attendanceDate,
    status,
    remarks,
    schoolId = 'school-001',
  } = attendanceData;

  try {
    const result = await pool.query(
      `INSERT INTO attendance ("studentId", "userId", "attendanceDate", status, remarks, "schoolId")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [studentId, userId, attendanceDate, status, remarks, schoolId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }
};

// Helper to update attendance record
export const updateAttendance = async (pool, id, attendanceData) => {
  const { status, remarks } = attendanceData;

  if (!status && !remarks) {
    return null;
  }

  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (remarks !== undefined) {
      updates.push(`remarks = $${paramCount}`);
      values.push(remarks);
      paramCount++;
    }

    updates.push('"updatedAt" = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE attendance SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error updating attendance record:', error);
    throw error;
  }
};

// Helper to delete attendance record
export const deleteAttendance = async (pool, id) => {
  try {
    await pool.query('DELETE FROM attendance WHERE id = $1', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    throw error;
  }
};

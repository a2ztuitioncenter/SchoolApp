// dataController.js - Logic for fetching student dashboard data
import { getUserById } from '../models/User.js';
import { getAllStudentFees, getFeesSummary } from '../models/Fee.js';
import { getAttendancePercentage, getAttendanceSummary, getAttendanceByStudentId } from '../models/Attendance.js';

// Helper to get student by userId using inline pool query
async function getStudentByUserId(pool, userId) {
  const result = await pool.query('SELECT * FROM students WHERE "userId" = $1 LIMIT 1', [userId]);
  return result.rows[0] || null;
}

async function createStudentRecord(pool, userId, user) {
  const result = await pool.query(
    `INSERT INTO students ("userId", name, "classLevel", phone, email, "joiningDate", status)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'active') RETURNING *`,
    [userId, user.phone ? `Student (${user.phone})` : 'New Student', '10', user.phone || '', user.email || `student${userId}@a2z.local`]
  );
  return result.rows[0];
}

export const getStudentDashboard = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const pool = req.db;
    let student = await getStudentByUserId(pool, userId);

    if (!student) {
      const user = await getUserById(pool, userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      student = await createStudentRecord(pool, userId, user);
    }

    // Parallel fetch of attendance, fees, and homework (targeted by classLevel)
    const [attendancePercentage, attendanceSummary, feesSummary, allFees, homeworkResult] = await Promise.all([
      getAttendancePercentage(pool, student.id, 30),
      getAttendanceSummary(pool, student.id),
      getFeesSummary(pool, student.id),
      getAllStudentFees(pool, student.id),
      pool.query('SELECT * FROM homework WHERE "classLevel" = $1 ORDER BY "dueDate" ASC LIMIT 5', [student.classLevel])
    ]);

    return res.json({
      success: true,
      data: {
        profile: {
          id: student.id,
          userId: student.userId,
          name: student.name,
          classLevel: student.classLevel,
          fatherName: student.fatherName,
          joiningDate: student.joiningDate,
          status: student.status,
        },
        attendance: {
          presentDays: attendancePercentage.presentDays,
          absentDays: attendancePercentage.absentDays,
          totalDays: attendancePercentage.totalWorkingDays,
          percentage: attendancePercentage.percentage,
          summary: attendanceSummary,
        },
        fees: {
          totalAmount: parseFloat(feesSummary.totalAmount) || 0,
          totalPaid: parseFloat(feesSummary.totalPaid) || 0,
          totalPending: parseFloat(feesSummary.totalPending) || 0,
          pendingCount: parseInt(feesSummary.pendingCount) || 0,
          paidCount: parseInt(feesSummary.paidCount) || 0,
          fees: (allFees || []).slice(0, 5),
        },
        homework: homeworkResult.rows || [],
        courseProgress: { percentage: 0, completedLessons: 0, totalLessons: 0 },
      },
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', message: error.message });
  }
};

export const getStudentAttendance = async (req, res) => {
  const { userId } = req.params;
  try {
    const pool = req.db;
    const student = await getStudentByUserId(pool, userId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [records, summary, pct] = await Promise.all([
      getAttendanceByStudentId(pool, student.id, req.query.startDate, req.query.endDate),
      getAttendanceSummary(pool, student.id),
      getAttendancePercentage(pool, student.id)
    ]);

    res.json({ success: true, studentId: student.id, name: student.name, summary: pct, attendanceSummary: summary, records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance data', message: error.message });
  }
};

export const getStudentFees = async (req, res) => {
  const { userId } = req.params;
  try {
    const pool = req.db;
    const student = await getStudentByUserId(pool, userId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [fees, summary] = await Promise.all([
      getAllStudentFees(pool, student.id),
      getFeesSummary(pool, student.id)
    ]);

    res.json({ success: true, studentId: student.id, name: student.name, summary, fees });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fee data', message: error.message });
  }
};

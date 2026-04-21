// dataController.js - Logic for fetching student dashboard data using snake_case
import { getAllStudentFees, getFeesSummary } from '../fees/Fee.js';
import { getAttendancePercentage, getAttendanceSummary, getAttendanceByStudentId } from '../attendance/Attendance.js';

// Helper to get student by userId using inline pool query
async function getStudentByUserId(pool, userId) {
  const result = await pool.query('SELECT * FROM students WHERE "userId" = $1 LIMIT 1', [userId]);
  return result.rows[0] || null;
}

export const getStudentDashboard = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const pool = req.db;
    const student = await getStudentByUserId(pool, userId);

    if (!student) {
      console.warn(`Student not found for userId: ${userId}`);
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log(`📌 Dashboard request for student:`, student);

    // Parallel fetch of attendance, fees, homework, timetable, and notifications

    // Note: Database columns are now camelCase.
    const [attendancePercentage, attendanceSummary, feesSummary, allFees, homeworkResult, timetableResult, notificationsResult] = await Promise.all([
      getAttendancePercentage(pool, student.id, 30),
      getAttendanceSummary(pool, student.id),
      getFeesSummary(pool, student.id),
      getAllStudentFees(pool, student.id),
      pool.query(
        `SELECT * FROM homework 
         WHERE "classLevel" = $1 AND (section = $2 OR section = 'ALL')
         ORDER BY "dueDate" ASC, "createdAt" DESC LIMIT 15`, 
        [student.classLevel, student.section]
      ),
      pool.query(
        `SELECT * FROM timetable 
         WHERE "classLevel" = $1 AND (section = $2 OR section = 'ALL') 
         ORDER BY "dayOfWeek", "startTime" ASC`, 
        [student.classLevel, student.section]
      ),
      pool.query(
        `SELECT * FROM notifications 
         WHERE ("classLevel" = $1 OR "classLevel" IS NULL OR "recipientRole" = 'student')
         AND (section = $2 OR section IS NULL OR section = 'ALL')
         ORDER BY "createdAt" DESC LIMIT 10`,
        [student.classLevel, student.section]
      ),
    ]);

    const allHomework = (homeworkResult.rows || []).map(h => ({
      ...h,
      classLevel: h.classLevel,
      dueDate: h.dueDate,
      teacherId: h.teacherId,
      attachmentUrl: h.attachmentUrl,
      createdAt: h.createdAt
    }));
    const homework = allHomework.filter(h => h.type === 'homework').slice(0, 5);
    
    // Daily practice valid for 24 hours
    const now = new Date();
    const dailyPractice = allHomework.filter(h => {
        if (h.type !== 'daily_practice') return false;
        const created = new Date(h.createdAt);
        const hoursDiff = (now - created) / (1000 * 60 * 60);
        return hoursDiff <= 24;
    });

    return res.json({
      success: true,
      data: {
        profile: {
          id: student.id,
          userId: student.userId,
          name: student.name,
          classLevel: student.classLevel,
          section: student.section,
          rollNumber: student.rollNumber,
          fatherName: student.fatherName,
          joiningDate: student.joiningDate,
          status: student.status,
        },
        attendance: {
          presentDays: attendancePercentage.presentDays,
          totalDays: attendancePercentage.totalDays,
          percentage: attendancePercentage.percentage,
          summary: attendanceSummary,
        },
        fees: {
          totalAmount: parseFloat(feesSummary.total_amount) || 0,
          totalPaid: parseFloat(feesSummary.total_paid) || 0,
          totalPending: parseFloat(feesSummary.total_pending) || 0,
          pendingCount: parseInt(feesSummary.pending_count) || 0,
          paidCount: parseInt(feesSummary.paid_count) || 0,
          fees: (allFees || []).slice(0, 5),
        },
        homework,
        dailyPractice,
        timetable: timetableResult.rows || [],
        notifications: notificationsResult.rows || [],
        courseProgress: { percentage: 0, completedLessons: 0, totalLessons: 0 },
      },
    });
  } catch (error) {
    console.error('❌ Dashboard data error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
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
    res.status(500).json({ error: 'Failed to fetch attendance data' });
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
    res.status(500).json({ error: 'Failed to fetch fee data' });
  }
};

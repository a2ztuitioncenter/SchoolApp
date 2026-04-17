// dataController.js - Logic for fetching student dashboard data using snake_case
import { getAllStudentFees, getFeesSummary } from '../fees/Fee.js';
import { getAttendancePercentage, getAttendanceSummary, getAttendanceByStudentId } from '../attendance/Attendance.js';

// Helper to get student by user_id using inline pool query
async function getStudentByUserId(pool, userId) {
  const result = await pool.query('SELECT * FROM students WHERE user_id = $1 LIMIT 1', [userId]);
  return result.rows[0] || null;
}

export const getStudentDashboard = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const pool = req.db;
    const student = await getStudentByUserId(pool, userId);

    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    // Parallel fetch of attendance, fees, homework, timetable, and notifications
    // Note: Database columns are now snake_case.
    const [attendancePercentage, attendanceSummary, feesSummary, allFees, homeworkResult, timetableResult, notificationsResult] = await Promise.all([
      getAttendancePercentage(pool, student.id, 30),
      getAttendanceSummary(pool, student.id),
      getFeesSummary(pool, student.id),
      getAllStudentFees(pool, student.id),
      pool.query(
        `SELECT * FROM homework 
         WHERE class_level = $1 AND (section = $2 OR section = 'ALL')
         ORDER BY due_date ASC, created_at DESC LIMIT 15`, 
        [student.class_level, student.section]
      ),
      pool.query(
        `SELECT * FROM timetable 
         WHERE class_level = $1 AND (section = $2 OR section = 'ALL') 
         ORDER BY day_of_week, start_time ASC`, 
        [student.class_level, student.section]
      ),
      pool.query(
        `SELECT * FROM notifications 
         WHERE (class_level = $1 OR class_level IS NULL OR recipient_role = 'student')
         AND (section = $2 OR section IS NULL OR section = 'ALL')
         ORDER BY created_at DESC LIMIT 10`,
        [student.class_level, student.section]
      ),
    ]);

    const allHomework = homeworkResult.rows || [];
    const homework = allHomework.filter(h => h.type === 'homework').slice(0, 5);
    
    // Daily practice valid for 24 hours
    const now = new Date();
    const dailyPractice = allHomework.filter(h => {
        if (h.type !== 'daily_practice') return false;
        const created = new Date(h.created_at);
        const hoursDiff = (now - created) / (1000 * 60 * 60);
        return hoursDiff <= 24;
    });

    return res.json({
      success: true,
      data: {
        profile: {
          id: student.id,
          userId: student.user_id,
          name: student.name,
          classLevel: student.class_level,
          section: student.section,
          rollNumber: student.roll_number,
          fatherName: student.father_name,
          joiningDate: student.joining_date,
          status: student.status,
        },
        attendance: {
          presentDays: attendancePercentage.present_days,
          totalDays: attendancePercentage.total_days,
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
    console.error('Dashboard data error:', error);
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

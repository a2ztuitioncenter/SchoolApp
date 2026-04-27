// dataController.js - Logic for fetching student dashboard data using snake_case
import { getAllStudentFees, getFeesSummary } from '../fees/Fee.js';
import { getAttendancePercentage, getAttendanceSummary, getAttendanceByStudentId } from '../attendance/Attendance.js';
import { getStudentByUserId as fetchStudentByUserId } from './Student.js';

export const getStudentDashboard = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const pool = req.db;
    const student = await fetchStudentByUserId(pool, userId);

    if (!student) {
      console.warn(`Student not found for userId: ${userId}`);
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // Student fields are already mapped to camelCase by Student.js fetch
    const { id: studentId, classLevel, section } = student;

    console.log(`📌 Dashboard request for student:`, studentId, classLevel, section);

    // Parallel fetch of attendance, fees, homework, timetable, and notifications
    // Using try-catch wrappers for safety
    const safeQuery = async (q, p) => {
      try { return await pool.query(q, p); }
      catch (e) { console.error(`Query failed: ${q}`, e.message); return { rows: [] }; }
    };

    const [attendancePercentage, attendanceSummary, feesSummary, allFees, homeworkResult, timetableResult, notificationsResult] = await Promise.all([
      getAttendancePercentage(pool, studentId, 30).catch(e => ({ presentDays: 0, totalDays: 0, percentage: 0 })),
      getAttendanceSummary(pool, studentId).catch(e => ({})),
      getFeesSummary(pool, studentId).catch(e => ({})),
      getAllStudentFees(pool, studentId).catch(e => []),
      safeQuery(
        `SELECT * FROM homework 
         WHERE class_level = $1 AND (section = $2 OR section = 'ALL')
         ORDER BY due_date ASC, created_at DESC LIMIT 15`, 
        [classLevel, section]
      ),
      safeQuery(
        `SELECT t.*, u.name as teacher_name, s.name as subject_name
         FROM timetable t
         LEFT JOIN users u ON t.teacher_id = u.id
         LEFT JOIN subjects s ON t.subject_id = s.id
         WHERE t.class_level = $1 AND (t.section = $2 OR t.section = 'ALL') 
         ORDER BY t.day_of_week, t.start_time ASC`, 
        [classLevel, section]
      ),
      safeQuery(
        `SELECT * FROM notifications 
         WHERE (class_level = $1 OR class_level IS NULL OR recipient_role = 'student')
         AND (section = $2 OR section IS NULL OR section = 'ALL')
         ORDER BY created_at DESC LIMIT 10`,
        [classLevel, section]
      ),
    ]);

    const normalizeRow = (h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      classLevel: h.class_level,
      section: h.section,
      dueDate: h.due_date,
      teacherId: h.teacher_id,
      attachmentUrl: h.attachment_url,
      createdAt: h.created_at,
      type: h.type
    });

    const allItems = (homeworkResult.rows || []).map(normalizeRow);
    const homework = allItems.filter(h => h.type === 'homework').slice(0, 5);
    
    const now = new Date();
    const dailyPractice = allItems.filter(h => {
        if (h.type !== 'daily_practice') return false;
        const created = new Date(h.createdAt);
        return (now - created) / (1000 * 60 * 60) <= 24;
    });

    return res.json({
      success: true,
      data: {
        profile: student,
        attendance: {
          presentDays: attendancePercentage.presentDays,
          totalDays: attendancePercentage.totalDays,
          percentage: attendancePercentage.percentage,
          summary: attendanceSummary,
        },
        fees: {
          totalAmount: parseFloat(feesSummary?.total_amount) || 0,
          totalPaid: parseFloat(feesSummary?.total_paid) || 0,
          totalPending: parseFloat(feesSummary?.total_pending) || 0,
          pendingCount: parseInt(feesSummary?.pending_count) || 0,
          paidCount: parseInt(feesSummary?.paid_count) || 0,
          fees: (allFees || []).slice(0, 5),
        },
        homework,
        dailyPractice,
        timetable: (timetableResult.rows || []).map(t => ({
          id: t.id,
          classLevel: t.class_level,
          startTime: t.start_time,
          endTime: t.end_time,
          subjectId: t.subject_id,
          teacherId: t.teacher_id,
          subject: t.subject_name || t.subject,
          teacher: t.teacher_name,
          dayOfWeek: t.day_of_week
        })),
        notifications: (notificationsResult.rows || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          classLevel: n.class_level,
          section: n.section,
          recipientRole: n.recipient_role,
          attachmentUrl: n.attachment_url,
          createdAt: n.created_at
        })),
        courseProgress: { percentage: 0, completedLessons: 0, totalLessons: 0 },
      },
    });
  } catch (error) {
    console.error('❌ Dashboard Exception:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getStudentAttendance = async (req, res) => {
  const { userId } = req.params;
  try {
    const pool = req.db;
    const student = await fetchStudentByUserId(pool, userId);
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
    const student = await fetchStudentByUserId(pool, userId);
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

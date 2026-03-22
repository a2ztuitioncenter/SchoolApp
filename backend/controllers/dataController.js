// dataController.js - Logic for fetching student dashboard data
import { getStudentByUserId } from '../models/Student.js';
import { getTotalPendingAmount, getAllStudentFees, getFeesSummary } from '../models/Fee.js';
import { getAttendancePercentage, getAttendanceSummary, getAttendanceByStudentId } from '../models/Attendance.js';

/**
 * Fetch complete dashboard data for a logged-in student
 * Returns: profile, attendance, fees status, and homework info
 */
export const getStudentDashboard = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const pool = req.db;

    // 1. Get student profile
    const student = await getStudentByUserId(pool, userId);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    // 2. Get attendance stats from database
    const attendancePercentage = await getAttendancePercentage(pool, student.id, 30);
    const attendanceSummary = await getAttendanceSummary(pool, student.id);

    const attendanceStats = {
      presentDays: attendancePercentage.presentDays,
      absentDays: attendancePercentage.absentDays,
      totalDays: attendancePercentage.totalWorkingDays,
      percentage: attendancePercentage.percentage,
      summary: attendanceSummary,
    };

    // 3. Get fee status from database
    const feesSummary = await getFeesSummary(pool, student.id);
    const allFees = await getAllStudentFees(pool, student.id);

    const feeStatus = {
      totalAmount: parseFloat(feesSummary.totalamount) || 0,
      totalPaid: parseFloat(feesSummary.totalpaid) || 0,
      totalPending: parseFloat(feesSummary.totalpending) || 0,
      pendingCount: parseInt(feesSummary.pendingcount) || 0,
      paidCount: parseInt(feesSummary.paidcount) || 0,
      fees: allFees.slice(0, 5), // Last 5 fees
    };

    // 4. Get homework (mock for now - can be extended to database)
    const homework = [
      {
        id: 'hw-001',
        subject: 'Mathematics',
        topic: 'Algebra - Equations',
        dueDate: '2025-03-30',
        status: 'pending',
      },
      {
        id: 'hw-002',
        subject: 'Science',
        topic: 'Physics - Motion',
        dueDate: '2025-03-28',
        status: 'submitted',
      },
    ];

    // 5. Get progress (mock for now - can be extended to database)
    const courseProgress = {
      percentage: 75,
      completedLessons: 15,
      totalLessons: 20,
    };

    return res.json({
      success: true,
      data: {
        profile: {
          id: student.id,
          userId: student.userid,
          name: student.name,
          classLevel: student.classlevel,
          section: student.section,
          fatherName: student.fathername,
          motherName: student.mothername,
          rollNumber: student.rollnumber,
          email: student.email,
          phone: student.phone,
        },
        attendance: attendanceStats,
        fees: feeStatus,
        homework,
        courseProgress,
      },
    });
  } catch (error) {
    console.error('❌ Dashboard data error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message,
    });
  }
};

/**
 * Get detailed attendance records for a student
 */
export const getStudentAttendance = async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const pool = req.db;
    const student = await getStudentByUserId(pool, userId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch attendance records from database
    const attendanceRecords = await getAttendanceByStudentId(pool, student.id, startDate, endDate);
    const attendanceSummary = await getAttendanceSummary(pool, student.id);
    const attendancePercentage = await getAttendancePercentage(pool, student.id);

    res.json({
      success: true,
      studentId: student.id,
      name: student.name,
      summary: attendancePercentage,
      attendanceSummary,
      records: attendanceRecords,
    });
  } catch (error) {
    console.error('❌ Attendance error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendance data',
      message: error.message,
    });
  }
};

/**
 * Get fees status and history for a student
 */
export const getStudentFees = async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = req.db;
    const student = await getStudentByUserId(pool, userId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const fees = await getAllStudentFees(pool, student.id);
    const feesSummary = await getFeesSummary(pool, student.id);

    res.json({
      success: true,
      studentId: student.id,
      name: student.name,
      summary: feesSummary,
      fees,
    });
  } catch (error) {
    console.error('❌ Fees error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch fee data',
      message: error.message,
    });
  }
};

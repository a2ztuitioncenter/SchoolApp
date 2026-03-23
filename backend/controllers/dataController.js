// dataController.js - Logic for fetching student dashboard data
import { getStudentByUserId, createStudent } from '../models/Student.js';
import { getTotalPendingAmount, getAllStudentFees, getFeesSummary } from '../models/Fee.js';
import { getAttendancePercentage, getAttendanceSummary, getAttendanceByStudentId } from '../models/Attendance.js';
import { getUserById } from '../models/User.js';

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

    // 1. Get student profile - or create one if it doesn't exist
    let student = await getStudentByUserId(pool, userId);
    
    if (!student) {
      console.warn(`⚠️  Student record not found for userId: ${userId}, attempting to create...`);
      
      // Try to get user details first
      const user = await getUserById(pool, userId);
      if (!user) {
        return res.status(404).json({ error: 'User record not found' });
      }

      // Create a default student record
      try {
        student = await createStudent(pool, {
          userId: userId,
          name: user.phone ? `Student (${user.phone})` : 'New Student',
          classLevel: '10',
          section: 'A',
          fatherName: 'Father Name',
          motherName: 'Mother Name',
          phone: user.phone || '',
          email: user.email || `student${userId}@a2z.local`,
          joiningDate: new Date().toISOString().split('T')[0],
          status: 'Active',
          rollNumber: Math.floor(Math.random() * 100).toString(),
          schoolId: 'school-001',
        });
        console.log('✅ Student record created for userId:', userId);
      } catch (createError) {
        console.error('❌ Failed to create student record:', createError.message);
        return res.status(500).json({ error: 'Failed to initialize student record', details: createError.message });
      }
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
      totalAmount: parseFloat(feesSummary.totalAmount || feesSummary.totalamount) || 0,
      totalPaid: parseFloat(feesSummary.totalPaid || feesSummary.totalpaid) || 0,
      totalPending: parseFloat(feesSummary.totalPending || feesSummary.totalpending) || 0,
      pendingCount: parseInt(feesSummary.pendingCount || feesSummary.pendingcount) || 0,
      paidCount: parseInt(feesSummary.paidCount || feesSummary.paidcount) || 0,
      fees: allFees ? allFees.slice(0, 5) : [], // Last 5 fees
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
          userId: student.userId,
          name: student.name,
          classLevel: student.classLevel,
          fatherName: student.fatherName,
          joiningDate: student.joiningDate,
          status: student.status,
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

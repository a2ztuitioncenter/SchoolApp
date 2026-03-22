import express from 'express';
import { getUserByPhone, createUser } from '../models/User.js';
import { createStudent, getStudentsBySchool } from '../models/Student.js';
import { getPendingFees, getAllStudentFees, getFeesSummary } from '../models/Fee.js';

const router = express.Router();

/**
 * Get all teachers
 * GET /api/admin/teachers
 */
router.get('/teachers', async (req, res) => {
  const pool = req.db;

  try {
    const result = await pool.query(
      'SELECT id, phone, email, role, isActive FROM users WHERE role = $1 ORDER BY phone',
      ['teacher']
    );

    return res.json({
      success: true,
      teachers: result.rows,
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

/**
 * Create new teacher
 * POST /api/admin/teachers/create
 */
router.post('/teachers/create', async (req, res) => {
  const { name, phone, email } = req.body;
  const pool = req.db;

  try {
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Check if phone already exists
    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Create teacher user
    const teacher = await createUser(pool, {
      phone,
      email,
      password: 'teacher123', // Default password
      role: 'teacher',
      schoolId: 'school-001',
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      teacher: { id: teacher.id, phone: teacher.phone, email: teacher.email, role: teacher.role },
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return res.status(500).json({ error: error.message || 'Failed to create teacher' });
  }
});

/**
 * Delete teacher
 * DELETE /api/admin/teachers/:id
 */
router.delete('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const pool = req.db;

  try {
    // Check if user exists and is a teacher
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (result.rows[0].role !== 'teacher') {
      return res.status(400).json({ error: 'User is not a teacher' });
    }

    // Delete teacher (this will cascade delete homework)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

/**
 * Get all users
 * GET /api/admin/users
 */
router.get('/users', async (req, res) => {
  const pool = req.db;

  try {
    const result = await pool.query(
      'SELECT id, phone, email, role, isActive FROM users WHERE role IN ($1, $2, $3)',
      ['teacher', 'staff', 'admin']
    );

    return res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Create new user (teacher, staff, admin)
 * POST /api/admin/users/create
 */
router.post('/users/create', async (req, res) => {
  const { name, phone, email, role } = req.body;
  const pool = req.db;

  try {
    if (!name || !phone || !role) {
      return res.status(400).json({ error: 'Name, phone, and role are required' });
    }

    // Check if phone already exists
    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Create user with default password for development
    const user = await createUser(pool, {
      phone,
      email,
      password: 'password123', // Default password - should be changed on first login
      role,
      schoolId: 'school-001',
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: { id: user.id, phone: user.phone, role: user.role },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

/**
 * Get all students
 * GET /api/admin/students
 */
router.get('/students', async (req, res) => {
  const pool = req.db;

  try {
    const result = await pool.query(
      `SELECT s.*, u.phone 
       FROM students s 
       LEFT JOIN users u ON s.userId = u.id 
       ORDER BY s.name ASC`
    );

    return res.json({
      success: true,
      students: result.rows,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
});

/**
 * Create new student
 * POST /api/admin/students/create
 */
router.post('/students/create', async (req, res) => {
  const { 
    name, 
    phone, 
    email, 
    classLevel, 
    section, 
    fatherName, 
    motherName,
    joiningDate,
    status 
  } = req.body;
  const pool = req.db;

  try {
    if (!name || !phone || !classLevel) {
      return res.status(400).json({ error: 'Name, phone, and class level are required' });
    }

    // Check if phone exists as user
    let user = await getUserByPhone(pool, phone);

    // If user doesn't exist, create one
    if (!user) {
      user = await createUser(pool, {
        phone,
        email,
        password: 'student123', // Default password
        role: 'student',
        schoolId: 'school-001',
      });
    }

    // Create student record
    const student = await createStudent(pool, {
      userId: user.id,
      name,
      classLevel,
      section: section || 'A',
      fatherName: fatherName || '',
      motherName: motherName || '',
      phone,
      email,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      status: status || 'active',
      rollNumber: Math.floor(Math.random() * 10000).toString(),
      schoolId: 'school-001',
    });

    return res.status(201).json({
      success: true,
      message: 'Student onboarded successfully',
      student,
    });
  } catch (error) {
    console.error('Error creating student:', error);
    return res.status(500).json({ error: error.message || 'Failed to onboard student' });
  }
});

/**
 * Get all unpaid fees
 * GET /api/admin/financials/unpaid-fees
 */
router.get('/financials/unpaid-fees', async (req, res) => {
  const pool = req.db;

  try {
    const result = await pool.query(
      `SELECT 
        f.*,
        s.name as student_name,
        s.classlevel,
        u.phone
       FROM fees f
       JOIN students s ON f.studentId = s.id
       JOIN users u ON f.userId = u.id
       WHERE f.ispaid = FALSE
       ORDER BY f.duedate ASC`
    );

    return res.json({
      success: true,
      fees: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching unpaid fees:', error);
    return res.status(500).json({ error: 'Failed to fetch unpaid fees' });
  }
});

/**
 * Get financial summary report
 * GET /api/admin/financials/report
 */
router.get('/financials/report', async (req, res) => {
  const pool = req.db;

  try {
    // Get all fees
    const feesResult = await pool.query(
      `SELECT 
        COUNT(*) as totalRecords,
        COALESCE(SUM(amount), 0) as totalAmount,
        COALESCE(SUM(CASE WHEN ispaid = TRUE THEN amount ELSE 0 END), 0) as totalPaid,
        COALESCE(SUM(CASE WHEN ispaid = FALSE THEN amount ELSE 0 END), 0) as totalPending,
        SUM(CASE WHEN ispaid = TRUE THEN 1 ELSE 0 END) as paidCount,
        SUM(CASE WHEN ispaid = FALSE THEN 1 ELSE 0 END) as pendingCount
       FROM fees`
    );

    // Get students with unpaid fees
    const unpaidResult = await pool.query(
      `SELECT COUNT(DISTINCT studentId) as studentsWithUnpaid
       FROM fees
       WHERE ispaid = FALSE`
    );

    const report = {
      ...feesResult.rows[0],
      studentsWithUnpaid: unpaidResult.rows[0].studentsWithUnpaid,
    };

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

import express from 'express';
import { getUserByPhone, createUser } from '../models/User.js';
import { getStudentByUserId, createStudent } from '../models/Student.js';

const router = express.Router();

// Student login endpoint
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  const pool = req.db;

  try {
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user by phone
    const user = await getUserByPhone(pool, phone);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Role check for student (frontend uses this endpoint for student login)
    if (user.role !== 'student') {
        return res.status(403).json({ error: 'Unauthorized role' });
    }

    // Development password check
    if (password !== 'student123' && password !== 'password123') {
        // Find if password matches what was registerd (if any)
        // For now, allow simple checks since this is dev
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    }

    // Get student details
    const studentData = await getStudentByUserId(pool, user.id);

    res.json({ 
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone
      },
      student: studentData,
      userId: user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * Student Registration - Create new student account
 * POST /api/auth/register
 * Payload: { name, phone, password, classLevel }
 */
router.post('/register', async (req, res) => {
  const { name, phone, password, classLevel } = req.body;
  const pool = req.db;

  try {
    // Validation
    if (!name || !phone || !password || !classLevel) {
      return res.status(400).json({ error: 'All fields (name, phone, password, classLevel) are required' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be a 10-digit number' });
    }

    // Check if phone number already exists
    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Create user account
    const user = await createUser(pool, {
      phone,
      email: `${phone}@student.local`,
      password,
      role: 'student',
      schoolId: 'school-001',
    });

    // Create student record using double-quoted camelCase for database mapping
    const joiningDate = new Date().toISOString().split('T')[0];
    const rollNumber = 'REG-' + Math.floor(1000 + Math.random() * 9000);

    const student = await createStudent(pool, {
      userId: user.id,
      name,
      classLevel,
      phone,
      email: user.email,
      joiningDate,
      status: 'active',
      rollNumber,
      schoolId: 'school-001',
    });

    return res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
      student: {
        id: student.id,
        name: student.name,
        classLevel: student.classLevel,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * Admin Login - Verify credentials and check admin role
 * POST /api/auth/admin-login
 */
router.post('/admin-login', async (req, res) => {
  const { phone, password } = req.body;
  const pool = req.db;

  try {
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user by phone
    const user = await getUserByPhone(pool, phone);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin') { // Fixed to lowercase
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have admin privileges',
        user: { id: user.id, role: user.role }
      });
    }

    // For development: Simple password check
    if (password !== 'admin123') { 
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return success with user data
    return res.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * Teacher Login - Verify credentials and check teacher role
 * POST /api/auth/teacher-login
 */
router.post('/teacher-login', async (req, res) => {
  const { phone, password } = req.body;
  const pool = req.db;

  try {
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user by phone
    const user = await getUserByPhone(pool, phone);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is teacher
    if (user.role !== 'teacher') { // Fixed to lowercase
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have teacher privileges',
        user: { id: user.id, role: user.role }
      });
    }

    // For development: Simple password check
    if (password !== 'teacher123') { 
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return success with user data
    return res.json({
      success: true,
      message: 'Teacher login successful',
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

export default router;
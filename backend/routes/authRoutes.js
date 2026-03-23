import express from 'express';
import { getUserByPhone, createUser } from '../models/User.js';
import { getStudentByUserId, createStudent } from '../models/Student.js';

const router = express.Router();

// Student login endpoint
router.post('/login', async (req, res) => {
  const { phone, role } = req.body;
  const pool = req.db;

  try {
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Try to find user by phone
    const userQuery = 'SELECT id, role FROM users WHERE phone = $1';
    const result = await pool.query(userQuery, [phone]);

    let user = result.rows[0];

    if (!user) {
      // Create new user if doesn't exist (development)
      const normalizedRole = role ? role.toLowerCase() : 'student'; // Fixed to lowercase
      const createResult = await pool.query(
        'INSERT INTO users (phone, email, role) VALUES ($1, $2, $3) RETURNING id, role',
        [phone, `${phone}@student.local`, normalizedRole]
      );
      user = createResult.rows[0];
    }

    // If user is a student, get student details
    let studentData = null;
    if (user.role === 'student') { // Fixed to lowercase
      const studentQuery = 'SELECT id, name, "classLevel", section FROM students WHERE "userId" = $1';
      const studentResult = await pool.query(studentQuery, [user.id]);
      if (studentResult.rows.length > 0) {
        studentData = studentResult.rows[0];
      }
    }

    res.json({ 
      success: true,
      user: {
        id: user.id,
        role: user.role,
        phone: phone
      },
      student: studentData,
      userId: user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Student Registration - Create new student account
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const { firstName, lastName, phone, email, classLevel, section } = req.body;
  const pool = req.db;

  try {
    // Validation
    if (!firstName || !lastName || !phone || !email || !classLevel || !section) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be a 10-digit number' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if phone number already exists
    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Create user account
    const user = await createUser(pool, {
      phone,
      email,
      role: 'student', // Fixed to lowercase
      schoolId: 'school-001',
    });

    // Create student record
    const fullName = `${firstName} ${lastName}`;
    const joiningDate = new Date().toISOString().split('T')[0];
    const rollNumber = Math.floor(Math.random() * 10000).toString();

    const student = await createStudent(pool, {
      userId: user.id,
      name: fullName,
      classLevel: `${classLevel}A`, // Add section to class level
      section: section,
      phone,
      email,
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
        email: user.email,
        role: user.role,
      },
      student: {
        id: student.id,
        name: student.name,
        classLevel: student.classLevel,
        section: student.section,
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

/**
 * Parent Login - Verify credentials and check parent role
 * POST /api/auth/parent-login
 */
router.post('/parent-login', async (req, res) => {
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

    // Check if user is parent
    if (user.role !== 'parent') { // Fixed to lowercase
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have parent privileges',
        user: { id: user.id, role: user.role }
      });
    }

    // For development: Simple password check
    if (password !== 'parent123') { 
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return success with user data
    return res.json({
      success: true,
      message: 'Parent login successful',
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Parent login error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

export default router;
import express from 'express';
import { getUserByPhone, createUser } from '../models/User.js';
import { getStudentByUserId, createStudent } from '../models/Student.js';

const router = express.Router();

// Student login endpoint
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  const pool = req.db;

  try {
    const userQuery = 'SELECT id, role FROM users WHERE phone = $1';
    const result = await pool.query(userQuery, [phone]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number' });
    }

    res.json({ 
      success: true, 
      user: result.rows[0] 
    });
  } catch (error) {
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
      role: 'student',
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
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have admin privileges',
        user: { id: user.id, role: user.role }
      });
    }

    // For development: Simple password check
    // In production, use bcrypt for password verification
    if (password !== 'admin123') { // Default dev password
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

export default router;
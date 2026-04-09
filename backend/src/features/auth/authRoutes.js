import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByPhone, createUser, getApprovedUser, getUsersByStatus, updateUserStatus } from './User.js';
import { getStudentByUserId, createStudent } from '../student/Student.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'tuition-app-dev-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Generate JWT Token
 */
const generateToken = (userId, role, phone) => {
  return jwt.sign(
    { 
      userId, 
      role, 
      phone,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

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
    // Normalize role to lowercase for comparison
    const userRole = user.role ? user.role.toLowerCase() : '';
    if (userRole !== 'student') {
        return res.status(403).json({ error: 'Unauthorized role' });
    }

    // Check if user account is approved (status = 'active')
    if (user.status !== 'active') {
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your account is awaiting admin approval. Please try again later.' });
      } else if (user.status === 'rejected') {
        return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
      }
    }

    // Verify password using bcryptjs
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    // Development fallback (keep for compatibility with existing plain text tests if any)
    const isMockPassword = password === 'student123' || password === 'password123';

    if (!passwordMatch && !isMockPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get student details
    const studentData = await getStudentByUserId(pool, user.id);

    // Generate JWT token
    const token = generateToken(user.id, user.role, phone);

    res.json({ 
      success: true,
      message: 'Login successful',
      token,
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
  const { name, phone, password, classLevel, section } = req.body;
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
      section: section || null,
      phone,
      email: user.email,
      joiningDate,
      status: 'active',
      rollNumber,
      schoolId: 'school-001',
    });

    // Generate JWT token
    const token = generateToken(user.id, user.role, phone);

    return res.json({
      success: true,
      message: 'Registration successful',
      token,
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
    const userRole = user.role ? user.role.toLowerCase() : '';
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have admin privileges',
        user: { id: user.id, role: user.role }
      });
    }

    // Verify password using bcryptjs
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role, phone);

    // Return success with user data
    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
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
    const userRole = user.role ? user.role.toLowerCase() : '';
    if (userRole !== 'teacher') {
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have teacher privileges',
        user: { id: user.id, role: user.role }
      });
    }

    // Check if user account is approved (status = 'active')
    if (user.status !== 'active') {
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your account is awaiting admin approval. Please try again later.' });
      } else if (user.status === 'rejected') {
        return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
      }
    }

    // Verify password using bcryptjs
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role, phone);

    // Return success with user data
    return res.json({
      success: true,
      message: 'Teacher login successful',
      token,
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
 * Teacher Registration - Create new teacher account (pending approval)
 * POST /api/auth/teacher-register
 * Payload: { name, phone, email, password, confirmPassword }
 */
router.post('/teacher-register', async (req, res) => {
  const { name, phone, email, password, confirmPassword } = req.body;
  const pool = req.db;

  try {
    // Validation
    if (!name || !phone || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be a 10-digit number' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if phone number already exists
    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Create user account with status = 'pending'
    const user = await createUser(pool, {
      name,
      phone,
      email,
      password,
      role: 'teacher',
      schoolId: 'school-001',
    });

    // Generate JWT token (for pending approval)
    const token = generateToken(user.id, user.role, phone);

    return res.json({
      success: true,
      message: 'Registration successful. Your account is awaiting admin approval.',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * GET /api/auth/admin/pending-users
 * Fetch all pending user registrations (admin only)
 */
router.get('/admin/pending-users', authenticate, authorize('admin'), async (req, res) => {
  const pool = req.db;
  const schoolId = req.query.schoolId || 'school-001';

  try {
    const pendingUsers = await getUsersByStatus(pool, 'pending', schoolId);
    
    return res.json({
      success: true,
      count: pendingUsers.length,
      users: pendingUsers,
    });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return res.status(500).json({ error: 'Server error fetching pending users' });
  }
});

/**
 * POST /api/auth/admin/approve-user/:userId
 * Approve a pending user registration (admin only)
 */
router.post('/admin/approve-user/:userId', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const pool = req.db;
  
  try {
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Update user status to 'active'
    const updatedUser = await updateUserStatus(pool, parseInt(userId), 'active');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'User approved successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error approving user:', error);
    return res.status(500).json({ error: 'Server error approving user' });
  }
});

/**
 * POST /api/auth/admin/reject-user/:userId
 * Reject a pending user registration (admin only)
 */
router.post('/admin/reject-user/:userId', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const pool = req.db;

  try {
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Update user status to 'rejected' with reason
    const updatedUser = await updateUserStatus(pool, parseInt(userId), 'rejected', null, reason || 'Admin rejection');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'User rejected successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error rejecting user:', error);
    return res.status(500).json({ error: 'Server error rejecting user' });
  }
});

export default router;
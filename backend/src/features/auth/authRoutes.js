import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByPhone, createUser, getApprovedUser, getUsersByStatus, updateUserStatus, generateTeacherId, assignTeacherToClasses, getClassLevels } from './User.js';
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

    if (!passwordMatch) {
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

// Register New Students

router.post('/register', async (req, res) => {
  const { firstName, lastName, phone, password, classLevel, section, fatherName, motherName, email } = req.body;
  const pool = req.db;

  try {
    // Validation
    if (!firstName || !phone || !password || !classLevel || !section || !fatherName || !motherName) {
      return res.status(400).json({ error: 'Missing required fields (Name, Phone, Password, Class, Section, and Parent names are mandatory)' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be a 10-digit number' });
    }

    const fullName = `${firstName} ${lastName || ''}`.trim();

    // Check if phone number already exists
    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Create user account
    const user = await createUser(pool, {
      name: fullName,
      phone,
      email: email || `${phone}@student.local`,
      password,
      role: 'student',
      schoolId: 'school-001',
    });

    // 2. Generate Unique Formatted Roll Number
    // Format: <class(2)><section(1)><serial(3)> e.g. 12B025
    const classPart = classLevel.toString().padStart(2, '0'); 
    const sectionPart = section.toUpperCase();
    const prefix = `${classPart}${sectionPart}`;

    // Find how many students already exist with this prefix in their roll number
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM students WHERE "rollNumber" LIKE $1`,
        [`${prefix}%`]
    );
    const nextSerial = parseInt(countResult.rows[0].count) + 1;
    const serialPart = nextSerial.toString().padStart(3, '0'); // 1 -> "001"
    const rollNumber = `${prefix}${serialPart}`;

    // Create student record
    const joiningDate = new Date().toISOString().split('T')[0];
    const student = await createStudent(pool, {
      userId: user.id,
      name: fullName,
      classLevel: classLevel.toString(),
      section,
      fatherName,
      motherName,
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
        rollNumber: student.rollNumber,
        classLevel: student.classLevel,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * Unified User Registration - Handles student, teacher, and staff registration
 * POST /api/auth/register
 * Payload: {
 *   role: 'student' | 'teacher' | 'staff',
 *   name, phone, password, confirmPassword,
 *   email (for teacher/staff),
 *   classLevel, section, fatherName, motherName (for student only)
 * }
 */
router.post('/register', async (req, res) => {
  const { role, name, phone, password, confirmPassword, email, classLevel, section, fatherName, motherName } = req.body;
  const pool = req.db;

  try {
    // Validate role
    if (!role || !['student', 'teacher', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be student, teacher, or staff.' });
    }

    // Common validation
    if (!name || !phone || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Name, phone, password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be a 10-digit number' });
    }

    // Check if phone already exists
    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Role-specific validation
    if (role === 'student') {
      if (!classLevel || !section || !fatherName || !motherName) {
        return res.status(400).json({ error: 'For student role: classLevel, section, fatherName, motherName are required' });
      }
    } else if (role === 'teacher' || role === 'staff') {
      if (!email) {
        return res.status(400).json({ error: 'For teacher/staff role: email is required' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // STUDENT REGISTRATION
    if (role === 'student') {
      const fullName = name;
      const user = await createUser(pool, {
        name: fullName,
        phone,
        email: email || `${phone}@student.local`,
        password,
        role: 'student',
        schoolId: 'school-001',
      });

      // Generate unique roll number
      const classPart = classLevel.toString().padStart(2, '0');
      const sectionPart = section.toUpperCase();
      const prefix = `${classPart}${sectionPart}`;

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM students WHERE "rollNumber" LIKE $1`,
        [`${prefix}%`]
      );
      const nextSerial = parseInt(countResult.rows[0].count) + 1;
      const serialPart = nextSerial.toString().padStart(3, '0');
      const rollNumber = `${prefix}${serialPart}`;

      const joiningDate = new Date().toISOString().split('T')[0];
      const student = await createStudent(pool, {
        userId: user.id,
        name: fullName,
        classLevel: classLevel.toString(),
        section,
        fatherName,
        motherName,
        phone,
        email: user.email,
        joiningDate,
        status: 'active',
        rollNumber,
        schoolId: 'school-001',
      });

      const token = generateToken(user.id, user.role, phone);

      return res.json({
        success: true,
        message: 'Student registration successful',
        token,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
        },
        student: {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          classLevel: student.classLevel,
        },
      });
    }

    // TEACHER/STAFF REGISTRATION
    if (role === 'teacher' || role === 'staff') {
      const teacherId = await generateTeacherId(pool, role);

      const user = await createUser(pool, {
        name,
        phone,
        email,
        password,
        role,
        schoolId: 'school-001',
        teacherId,
      });

      const token = generateToken(user.id, user.role, phone);

      return res.json({
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} registration successful. Your account is awaiting admin approval.`,
        token,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          status: user.status,
          teacherId: user.teacherId,
        },
      });
    }
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

    // 1. MASTER ADMIN CHECK (Direct from .env for modularity)
    const masterPhone = process.env.ADMIN_PHONE;
    const masterPassword = process.env.ADMIN_PASSWORD;

    if (masterPhone && masterPassword && phone === masterPhone && password === masterPassword) {
      console.log(`⭐ Master Admin login detected for ${phone}`);
      let user = await getUserByPhone(pool, phone);
      
      if (!user) {
        console.log("🛠️ Creating Master Admin in database on-the-fly...");
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          `INSERT INTO users (phone, email, password, role, status) VALUES ($1, $2, $3, $4, $5)`,
          [phone, 'admin@a2z.local', hashedPassword, 'admin', 'active']
        );
        user = await getUserByPhone(pool, phone);
      }

      const token = generateToken(user.id, 'admin', phone);
      return res.json({
        success: true,
        message: 'Admin login successful (Master Access)',
        token,
        user: { id: user.id, phone: user.phone, role: 'admin' }
      });
    }

    // 2. STANDARD DATABASE CHECK
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

    // Generate unique teacherId
    const teacherId = await generateTeacherId(pool, 'teacher');

    // Create user account with status = 'pending' and teacherId
    const user = await createUser(pool, {
      name,
      phone,
      email,
      password,
      role: 'teacher',
      schoolId: 'school-001',
      teacherId,
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
        teacherId: user.teacherId,
      },
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * GET /api/auth/admin/class-levels
 * Get list of available class levels for teacher/staff assignment (admin only)
 */
router.get('/admin/class-levels', authenticate, authorize('admin'), async (req, res) => {
  const pool = req.db;
  const schoolId = req.query.schoolId || 'school-001';

  try {
    const classLevels = await getClassLevels(pool, schoolId);
    
    return res.json({
      success: true,
      classLevels,
    });
  } catch (error) {
    console.error('Error fetching class levels:', error);
    return res.status(500).json({ error: 'Server error fetching class levels' });
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
 * For teacher/staff: requires classesAssigned array
 * Payload: { classesAssigned: ['9', '10', '11', '12'] } (for teacher/staff)
 */
router.post('/admin/approve-user/:userId', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const { classesAssigned } = req.body;
  const pool = req.db;
  
  try {
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const parsedUserId = parseInt(userId);

    // Fetch user to check role
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [parsedUserId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For teacher/staff, validate and assign classes
    if (user.role === 'teacher' || user.role === 'staff') {
      if (!Array.isArray(classesAssigned) || classesAssigned.length === 0) {
        return res.status(400).json({ error: 'classesAssigned must be a non-empty array for teacher/staff approval' });
      }

      // Assign classes to teacher/staff
      try {
        await assignTeacherToClasses(pool, parsedUserId, classesAssigned, user.schoolId);
      } catch (classError) {
        console.error('Error assigning classes:', classError);
        return res.status(500).json({ error: 'Failed to assign classes' });
      }
    }

    // Update user status to 'active'
    const updatedUser = await updateUserStatus(pool, parsedUserId, 'active', null);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} approved successfully` + (classesAssigned ? ' with class assignments' : ''),
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
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getUserByPhone, getUserByPhoneOrUsername, isUsernameTaken, createUser, getApprovedUser, getUsersByStatus, updateUserStatus, generateTeacherId, assignTeacherToClasses, getClassLevels } from './User.js';
import { getStudentByUserId, createStudent } from '../student/Student.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';
import { sanitizeIdentifier, sanitizeNullableText, sanitizeStringArray, sanitizeText } from '../../utils/sanitize.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
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

/**
 * Username validation helper
 * Rules: 5-50 chars, a-z A-Z 0-9 underscore only, no spaces
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return 'Username is required';
  username = username.trim();
  if (username.length < 5) return 'Username must be at least 5 characters';
  if (username.length > 50) return 'Username must be at most 50 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null; // valid
};

// Student login endpoint — supports phone OR username + DOB
router.post('/login', async (req, res) => {
  const { phone, identifier, dateOfBirth } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;

  try {
    if (!loginId || !dateOfBirth) {
      return res.status(400).json({ error: 'Phone/Username and date of birth are required' });
    }

    // Parse DD/MM/YY -> YYYY-MM-DD
    let dobISO;
    const parts = dateOfBirth.split('/');
    if (parts.length === 3) {
      const [dd, mm, yy] = parts;
      const year = yy.length === 2 ? (parseInt(yy) > 30 ? `19${yy}` : `20${yy}`) : yy;
      dobISO = `${year}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    } else {
      return res.status(400).json({ error: 'Invalid date format. Use DD/MM/YY' });
    }

    // Find user by phone OR username
    const user = await getUserByPhoneOrUsername(pool, loginId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Students only
    const userRole = user.role ? user.role.toLowerCase() : '';
    if (userRole !== 'student') {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
    } else if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact admin.' });
    }

    // Verify DOB against students table
    const dobResult = await pool.query(
      `SELECT id FROM students WHERE "userId" = $1 AND "dateOfBirth" = $2 LIMIT 1`,
      [user.id, dobISO]
    );
    if (dobResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const studentData = await getStudentByUserId(pool, user.id);
    const token = generateToken(user.id, user.role, user.phone);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, role: user.role, phone: user.phone },
      student: studentData ? {
        id: studentData.id,
        name: studentData.name,
        rollNumber: studentData.rollNumber,
        classLevel: studentData.classLevel,
      } : null,
      userId: user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Register New Students (DOB-based, no password required) — now with username
router.post('/register', async (req, res) => {
  const { role, phone, password, confirmPassword } = req.body;
  const pool = req.db;

  try {
    const normalizedRole = role || ((req.body.firstName || req.body.lastName || req.body.dateOfBirth) ? 'student' : 'teacher');
    if (!['student', 'teacher', 'staff'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be student, teacher, or staff.' });
    }

    const username = sanitizeIdentifier(req.body.username, 50);
    const sanitizedPhone = sanitizeIdentifier(phone, 15);
    const sanitizedEmail = sanitizeNullableText(req.body.email, 255);
    const classLevel = sanitizeIdentifier(req.body.classLevel, 20);
    const section = sanitizeIdentifier(req.body.section, 10);
    const fatherName = sanitizeNullableText(req.body.fatherName, 100);
    const motherName = sanitizeNullableText(req.body.motherName, 100);

    // Validate username if provided
    if (username) {
      const usernameError = validateUsername(username);
      if (usernameError) return res.status(400).json({ error: usernameError });
      const taken = await isUsernameTaken(pool, username);
      if (taken) return res.status(409).json({ error: 'Username already taken' });
    }

    if (normalizedRole !== 'student' && (!req.body.name || !sanitizedPhone || !password || !confirmPassword)) {
      return res.status(400).json({ error: 'Name, phone, and password are required' });
    }
    if (normalizedRole === 'student' && (!sanitizedPhone || !req.body.dateOfBirth)) {
      return res.status(400).json({ error: 'Name, phone, and Date of Birth are required' });
    }

    if (normalizedRole !== 'student' && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!/^\d{10}$/.test(sanitizedPhone)) {
      return res.status(400).json({ error: 'Phone must be a 10-digit number' });
    }

    const existingUser = await getUserByPhone(pool, sanitizedPhone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    if (normalizedRole === 'student') {
      if (!classLevel || !section || !fatherName || !motherName) {
        return res.status(400).json({ error: 'For student role: classLevel, section, fatherName, motherName are required' });
      }
    } else if (normalizedRole === 'teacher' || normalizedRole === 'staff') {
      if (!sanitizedEmail) {
        return res.status(400).json({ error: 'For teacher/staff role: email is required' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // STUDENT REGISTRATION
    if (normalizedRole === 'student') {
      const { dateOfBirth } = req.body;
      const fullName = sanitizeText(
        req.body.name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(),
        100
      );
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      
      const user = await createUser(pool, {
        name: fullName,
        phone: sanitizedPhone,
        email: sanitizedEmail || `${sanitizedPhone}@student.local`,
        password: dummyPassword,
        role: 'student',
        schoolId: 'school-001',
        username: username || null,
      });

      // Auto-generate username if not provided
      if (!username) {
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [`user_${user.id}`, user.id]);
      }

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

      let dobISO = null;
      if (dateOfBirth) {
        const parts = dateOfBirth.split('/');
        if (parts.length !== 3) {
          return res.status(400).json({ error: 'Invalid date format. Use DD/MM/YY' });
        }
        const [dd, mm, yy] = parts;
        const year = yy.length === 2 ? (parseInt(yy, 10) > 30 ? `19${yy}` : `20${yy}`) : yy;
        dobISO = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }

      const joiningDate = new Date().toISOString().split('T')[0];
      const student = await createStudent(pool, {
        userId: user.id,
        name: fullName,
        classLevel: classLevel.toString(),
        section,
        fatherName,
        motherName,
        phone: sanitizedPhone,
        email: user.email,
        joiningDate,
        dateOfBirth: dobISO,
        status: 'active',
        rollNumber,
        schoolId: 'school-001',
      });

      const token = generateToken(user.id, user.role, sanitizedPhone);

      return res.json({
        success: true,
        message: 'Student registration successful',
        token,
        user: { id: user.id, phone: user.phone, role: user.role, username: username || `user_${user.id}` },
        student: { id: student.id, name: student.name, rollNumber: student.rollNumber, classLevel: student.classLevel },
      });
    }

    // TEACHER/STAFF REGISTRATION
    if (normalizedRole === 'teacher' || normalizedRole === 'staff') {
      const teacherId = await generateTeacherId(pool, normalizedRole);
      const name = sanitizeText(req.body.name, 100);

      const user = await createUser(pool, {
        name,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        password,
        role: normalizedRole,
        schoolId: 'school-001',
        teacherId,
        username: username || null,
      });

      // Auto-generate username if not provided
      if (!username) {
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [`user_${user.id}`, user.id]);
      }

      const token = generateToken(user.id, user.role, sanitizedPhone);

      return res.json({
        success: true,
        message: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} registration successful. Your account is awaiting admin approval.`,
        token,
        user: { id: user.id, phone: user.phone, role: user.role, status: user.status, teacherId: user.teacherId, username: username || `user_${user.id}` },
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
  const { phone, identifier, password } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;

  try {
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Phone/Username and password are required' });
    }

    const user = await getUserByPhoneOrUsername(pool, loginId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userRole = user.role ? user.role.toLowerCase() : '';
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have admin privileges',
        user: { id: user.id, role: user.role }
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'This admin account has been deactivated.' });
    }

    const token = generateToken(user.id, user.role, user.phone);

    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: { id: user.id, phone: user.phone, role: user.role },
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
  const { phone, identifier, password } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;

  try {
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Phone/Username and password are required' });
    }

    const user = await getUserByPhoneOrUsername(pool, loginId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userRole = user.role ? user.role.toLowerCase() : '';
    if (userRole !== 'teacher') {
      return res.status(403).json({ 
        error: 'Access Denied: This account does not have teacher privileges',
        user: { id: user.id, role: user.role }
      });
    }

    if (!user.isActive || user.status !== 'active') {
      const msg = user.status === 'pending' 
        ? 'Your account is awaiting admin approval.'
        : (user.status === 'rejected' ? 'Your account has been rejected.' : 'Your account has been deactivated.');
      return res.status(403).json({ error: `${msg} Please contact admin.` });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role, user.phone);

    return res.json({
      success: true,
      message: 'Teacher login successful',
      token,
      user: { id: user.id, phone: user.phone, role: user.role },
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
  const { password, confirmPassword } = req.body;
  const pool = req.db;

  try {
    const name = sanitizeText(req.body.name, 100);
    const phone = sanitizeIdentifier(req.body.phone, 15);
    const email = sanitizeNullableText(req.body.email, 255);
    const username = sanitizeIdentifier(req.body.username, 50);

    if (!name || !phone || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate username if provided
    if (username) {
      const usernameError = validateUsername(username);
      if (usernameError) return res.status(400).json({ error: usernameError });
      const taken = await isUsernameTaken(pool, username);
      if (taken) return res.status(409).json({ error: 'Username already taken' });
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

    const existingUser = await getUserByPhone(pool, phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const teacherId = await generateTeacherId(pool, 'teacher');

    const user = await createUser(pool, {
      name,
      phone,
      email,
      password,
      role: 'teacher',
      schoolId: 'school-001',
      teacherId,
      username: username || null,
    });

    // Auto-generate username if not provided
    if (!username) {
      await pool.query('UPDATE users SET username = $1 WHERE id = $2', [`user_${user.id}`, user.id]);
    }

    const token = generateToken(user.id, user.role, phone);

    return res.json({
      success: true,
      message: 'Registration successful. Your account is awaiting admin approval.',
      token,
      user: { id: user.id, phone: user.phone, role: user.role, status: user.status, teacherId: user.teacherId, username: username || `user_${user.id}` },
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
  const schoolId = 'school-001';

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
  const schoolId = 'school-001';

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
      const sanitizedClasses = sanitizeStringArray(classesAssigned, 20);
      if (sanitizedClasses.length === 0) {
        return res.status(400).json({ error: 'classesAssigned must be a non-empty array for teacher/staff approval' });
      }

      // Assign classes to teacher/staff
      try {
        await assignTeacherToClasses(pool, parsedUserId, sanitizedClasses, user.schoolId);
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
  const reason = sanitizeNullableText(req.body.reason, 500);
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

/**
 * GET /api/auth/check-username?username=xyz
 * Real-time username availability check
 */
router.get('/check-username', async (req, res) => {
  const { username } = req.query;
  const pool = req.db;

  try {
    if (!username) {
      return res.status(400).json({ error: 'Username query parameter is required' });
    }

    const validationError = validateUsername(username);
    if (validationError) {
      return res.json({ available: false, error: validationError });
    }

    const taken = await isUsernameTaken(pool, username);
    return res.json({ available: !taken });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;

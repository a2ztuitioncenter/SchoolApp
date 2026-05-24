import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getUserByPhone, getUsersByPhone, getUserByPhoneOrUsername, isUsernameTaken, createUser, getApprovedUser, getUsersByStatus, updateUserStatus, generateTeacherId, assignTeacherToClasses, getClassLevels, countStudentsByPhone, isDuplicateStudent, getNonStudentByPhone, getUserById, updateLastLogin, MAP_USER } from './User.js';
import { getStudentByUserId, createStudent } from '../student/Student.js';
import { registerUser } from './registrationService.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';

import { sanitizeIdentifier, sanitizeNullableText, sanitizeStringArray, sanitizeText } from '../../utils/sanitize.js';
import { validateBody, loginSchema, adminLoginSchema, teacherLoginSchema, registerSchema, changePasswordSchema, validateUsername } from '../../utils/validate.js';

const router = express.Router();

const JWT_EXPIRY = '2h';
const REFRESH_EXPIRY = '7d';

const IS_PROD = process.env.NODE_ENV === 'production';

const generateToken = (userId, role, phone, schoolId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required but not found in process.env');
  }
  return jwt.sign(
    { userId, role, phone, schoolId, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

const generateRefreshToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required but not found in process.env');
  }
  return jwt.sign(
    { userId, type: 'refresh', iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
};

/** Set auth cookies on response */
const setAuthCookies = (res, accessToken, refreshToken, req) => {
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const origin = req?.headers?.origin || '';
  const isProd = process.env.NODE_ENV === 'production';

  // Determine if we are on an external production-like environment (e.g. Vercel→Render, Cloudflare tunnel)
  // Cross-site cookies require sameSite: 'None' + secure: true to be sent by the browser.
  const isExternalProd = origin.startsWith('https://') && !origin.includes('localhost') && !origin.includes('127.0.0.1');
  const crossSite = isProd || isExternalProd;

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? 'None' : 'Lax',
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    path: '/'
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth'
  });

  // CSRF token — readable by JS (NOT httpOnly) for double-submit pattern
  res.cookie('csrf', csrfToken, {
    httpOnly: false,
    secure: crossSite,
    sameSite: crossSite ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  return csrfToken;
};

/** Clear all auth cookies */
const clearAuthCookies = (res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('csrf', { path: '/' });
};


router.get('/sections', async (req, res) => {
  const { classLevel } = req.query;
  const pool = req.db;

  try {
    const result = await pool.query(
      'SELECT DISTINCT section FROM students WHERE class_level = $1 AND section IS NOT NULL AND section != \'\' ORDER BY section ASC',
      [classLevel]
    );
    const sections = result.rows.map(r => r.section);
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Fetch sections error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/check-username', async (req, res) => {

  const { username } = req.query;
  const pool = req.db;

  try {
    const validationError = validateUsername(username);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const taken = await isUsernameTaken(pool, username);
    res.json({ available: !taken });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { phone, identifier, password } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;

  try {
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Phone/Username and password are required' });
    }

    // Support multiple students sharing the same phone number
    const isPhone = /^\+?\d{10,15}$/.test(loginId);
    let user, studentData;

    if (isPhone) {
      // Find all student users with this phone number including password field
      const allUsersResult = await pool.query("SELECT * FROM users WHERE phone = $1", [loginId]);
      const studentUsers = allUsersResult.rows
        .map(u => ({ ...MAP_USER(u), password: u.password }))
        .filter(u => u.role?.toLowerCase() === 'student');

      if (studentUsers.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

      // Try each student user to find one whose password matches
      for (const candidate of studentUsers) {
        if (candidate.status === 'pending') continue;
        if (candidate.status === 'rejected') continue;
        if (candidate.isActive === false) continue;

        const isMatch = await bcrypt.compare(password, candidate.password);
        if (isMatch) {
          user = candidate;
          break;
        }
      }

      if (!user) {
        const pending = studentUsers.find(u => u.status === 'pending');
        if (pending) return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
        const rejected = studentUsers.find(u => u.status === 'rejected');
        if (rejected) return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      // Username login
      user = await getUserByPhoneOrUsername(pool, loginId, true);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const userRole = user.role ? user.role.toLowerCase() : '';
      if (userRole !== 'student') return res.status(403).json({ error: 'Unauthorized role' });
      if (user.status === 'pending') return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
      if (user.status === 'rejected') return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
      if (user.isActive === false) return res.status(403).json({ error: 'Your account has been deactivated. Please contact admin.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    }

    studentData = await getStudentByUserId(pool, user.id);
    await updateLastLogin(pool, user.id);
    const accessToken = generateToken(user.id, user.role, user.phone, user.schoolId);
    const refreshToken = generateRefreshToken(user.id);

    const csrfToken = setAuthCookies(res, accessToken, refreshToken, req);

    res.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name: user.name,
        email: user.email,
        user: {
          id: user.id,
          role: user.role,
          phone: user.phone,
          name: user.name,
          email: user.email,
          ...(user.teacherId && { teacherId: user.teacherId }),
          avatarUrl: user.avatarUrl,
          lastLoginAt: user.lastLoginAt
        }, avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt
      },
      student: studentData ? {
        id: studentData.id,
        name: studentData.name,
        rollNumber: studentData.rollNumber,
        classLevel: studentData.classLevel,
        section: studentData.section,
      } : null,
      userId: user.id,
      token: accessToken,
      csrfToken: csrfToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

router.post('/register', validateBody(registerSchema), async (req, res) => {
  let { role, phone, password, confirmPassword } = req.body;
  const pool = req.db;

  try {
    if (!role) {
      const isStudentForm = req.body.classLevel || req.body.class_level || req.body.dateOfBirth;
      if (isStudentForm) role = 'student';
      else return res.status(400).json({ error: 'Role is required' });
    }

    const normalizedRole = role.toLowerCase();
    const username = sanitizeIdentifier(req.body.username, 50);
    const sanitizedPhone = sanitizeIdentifier(phone, 15);
    const sanitizedEmail = sanitizeNullableText(req.body.email, 255);

    // Enforce matching, secure passwords for all public portal registrations
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // 1. Initial Checks (Duplicate Detection)
    if (username && await isUsernameTaken(pool, username)) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    if (normalizedRole === 'student') {
      const studentCount = await countStudentsByPhone(pool, sanitizedPhone);
      if (studentCount >= 4) return res.status(409).json({ error: 'Maximum 4 students per phone' });

      const fullName = sanitizeText(req.body.name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(), 100);
      req.body.name = fullName; // Ensure the service receives the computed name
      const dob = req.body.dateOfBirth;
      const classLevel = req.body.classLevel || req.body.class_level;

      if (dob && classLevel) {
        // Reuse validation from before or let service handle it
        const dparts = dob.split('/');
        if (dparts.length === 3) {
          const [dd, mm, yy] = dparts;
          const year = yy.length === 2 ? (parseInt(yy) > 30 ? `19${yy}` : `20${yy}`) : yy;
          const dobISO = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

          if (await isDuplicateStudent(pool, sanitizedPhone, fullName, classLevel.toString(), dobISO)) {
            return res.status(409).json({ error: 'Student already registered' });
          }
          req.body.dateOfBirth = dobISO; // Pass ISO to service
        }
      }
    } else {
      if (await getUserByPhone(pool, sanitizedPhone)) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    // 2. Execute Unified Registration
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await registerUser(client, {
        ...req.body,
        role: normalizedRole,
        source: 'public'
      });

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Registration successful. Awaiting admin approval.',
        data: {
          id: result.user.id,
          role: result.user.role,
          status: result.status,
          username: result.user.username,
          rollNumber: result.student?.rollNumber
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
});


router.post('/admin-login', validateBody(adminLoginSchema), async (req, res) => {
  const { phone, identifier, password } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;
  console.log(`[AUTH] admin-login attempt for: ${loginId}`);
  try {
    if (!loginId || !password) return res.status(400).json({ error: 'Phone/Username and password are required' });
    const user = await getUserByPhoneOrUsername(pool, loginId, true);
    if (!user) {
      console.warn(`[AUTH] Admin login failed: User ${loginId} not found`);
      return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    }
    if ((user.role || '').toLowerCase() !== 'admin') {
      console.warn(`[AUTH] Admin login failed: User ${loginId} is not an admin (Role: ${user.role})`);
      return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    }
    if (!await bcrypt.compare(password, user.password)) {
      console.warn(`[AUTH] Admin login failed: Invalid password for ${loginId}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isActive === false) return res.status(403).json({ error: 'This admin account has been deactivated.' });

    await updateLastLogin(pool, user.id);
    const accessToken = generateToken(user.id, user.role, user.phone, user.schoolId);
    const refreshToken = generateRefreshToken(user.id);
    const csrfToken = setAuthCookies(res, accessToken, refreshToken, req);
    console.log(`[AUTH] Admin login SUCCESS: ${loginId}`);
    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        email: user.email,
        teacherId: user.teacherId,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt
      },
      token: accessToken,
      csrfToken: csrfToken
    });
  } catch (error) {
    console.error('[AUTH] Admin login error:', error);
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

router.post('/teacher-login', validateBody(teacherLoginSchema), async (req, res) => {
  const { phone, identifier, password } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;
  try {
    if (!loginId || !password) return res.status(400).json({ error: 'Phone/Username and password are required' });
    const user = await getUserByPhoneOrUsername(pool, loginId, true);
    if (!user) return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    const userRole = (user.role || '').toLowerCase();
    if (userRole !== 'teacher' && userRole !== 'staff') return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    if (!['active', 'approved'].includes(user.status) || !user.isActive) {
      return res.status(403).json({ error: 'Account not active or awaiting approval' });
    }
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

    await updateLastLogin(pool, user.id);
    const accessToken = generateToken(user.id, user.role, user.phone, user.schoolId);
    const refreshToken = generateRefreshToken(user.id);
    const csrfToken = setAuthCookies(res, accessToken, refreshToken, req);
    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        email: user.email,
        teacherId: user.teacherId,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt
      },
      token: accessToken,
      csrfToken: csrfToken
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

router.get('/admin/pending-users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await getUsersByStatus(req.db, 'pending', req.user.schoolId);
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Pending users error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching pending users' });
  }
});

router.post('/admin/approve-user/:userId', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const { classesAssigned } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    const id = parseInt(userId);
    console.log(`[AdminApprove] Attempting to approve user ID: ${id}`);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid User ID format' });
    }

    const user = await getUserById(req.db, id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.status === 'active') {
      console.log(`[AdminApprove] User ${id} is already active`);
      return res.status(400).json({ success: false, error: 'User is already approved' });
    }

    // Perform approval in a transaction
    const client = await req.db.connect();
    try {
      await client.query('BEGIN');

      // Assign classes if applicable
      if ((user.role === 'teacher' || user.role === 'staff') && classesAssigned) {
        if (!Array.isArray(classesAssigned)) {
          throw new Error('classesAssigned must be an array');
        }

        const sanitizedClasses = [];
        const seen = new Set();

        for (const entry of classesAssigned) {
          if (entry === null || entry === undefined) continue;
          let val = entry;
          if (typeof val === 'string') {
            val = val.trim();
            if (val === '') continue;
            if (/^\d+$/.test(val)) {
              const num = parseInt(val, 10);
              if (!isNaN(num)) val = String(num);
            }
          } else if (typeof val === 'number') {
            if (!isNaN(val)) val = String(val);
          } else {
            continue;
          }

          if (val && !seen.has(val) && val.length <= 20) {
            sanitizedClasses.push(val);
            seen.add(val);
          }
          if (sanitizedClasses.length >= 20) break;
        }

        if (sanitizedClasses.length > 0) {
          await client.query('DELETE FROM teacher_class_assignment WHERE teacher_id = $1', [id]);
          for (const classLevel of sanitizedClasses) {
            await client.query(
              `INSERT INTO teacher_class_assignment (teacher_id, class_level, section, school_id)
               VALUES ($1, $2, $3, $4)`,
              [id, classLevel, 'ALL', user.schoolId]
            );
          }
        }
      }

      const updatedUserRes = await client.query(
        `UPDATE users 
         SET status = $2, approved_by = $3, status_updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, 'active', req.user.userId]
      );

      // Also sync status to students table if role is student
      if (user.role === 'student') {
        await client.query(
          'UPDATE students SET status = $1 WHERE user_id = $2',
          ['active', id]
        );
      }

      const updatedUser = updatedUserRes.rows[0];
      await client.query('COMMIT');

      console.log(`[AUTH] Admin ${req.user.userId} approved user ${id} (${user.role})`);

      res.json({
        success: true,
        message: 'User approved successfully',
        user: updatedUser,
        data: updatedUser
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error approving user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/admin/reject-user/:userId', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    const id = parseInt(userId);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid User ID format' });
    }

    const user = await getUserById(req.db, id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updatedUser = await updateUserStatus(req.db, id, 'rejected', null, reason || 'Admin rejection');

    console.log(`[AUTH] Admin ${req.user.userId} rejected user ${id}`);

    res.json({ success: true, message: 'User rejected', user: updatedUser, data: updatedUser });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error rejecting user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/admin/class-levels', authenticate, authorize('admin'), async (req, res) => {
  try {
    const classLevels = await getClassLevels(req.db, req.user.schoolId);
    res.json({ success: true, classLevels });
  } catch (error) {
    console.error('Error fetching class levels:', error);
    res.status(500).json({ error: 'Server error fetching class levels' });
  }
});

router.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const pool = req.db;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
    }

    // Fetch user with password
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect current password' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.userId]);

    console.log(`[AUTH] User ${req.user.userId} changed their password`);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Server error changing password' });
  }
});

// ── Logout ─────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out' });
});

// ── Verify (validate current session) ──────────────────────────
router.post('/verify', authenticate, async (req, res) => {
  try {
    const user = await getUserById(req.db, req.user.userId);
    if (!user || user.isActive === false) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid session' });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name: user.name,
        email: user.email,
        teacherId: user.teacherId,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Refresh Token ──────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const rToken = req.cookies?.refreshToken;
    if (!rToken) return res.status(401).json({ error: 'No refresh token', code: 'NO_REFRESH' });

    const decoded = jwt.verify(rToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const user = await getUserById(req.db, decoded.userId);
    if (!user || user.isActive === false) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User inactive or not found' });
    }

    // Rotate: issue new access + refresh tokens
    const newAccess = generateToken(user.id, user.role, user.phone, user.schoolId);
    const newRefresh = generateRefreshToken(user.id);
    setAuthCookies(res, newAccess, newRefresh, req);

    res.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name: user.name,
        email: user.email,
        teacherId: user.teacherId,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt
      },
      token: newAccess
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token expired', code: 'REFRESH_EXPIRED' });
    }
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;

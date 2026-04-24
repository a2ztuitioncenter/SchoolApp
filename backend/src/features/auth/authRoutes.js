import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getUserByPhone, getUsersByPhone, getUserByPhoneOrUsername, isUsernameTaken, createUser, getApprovedUser, getUsersByStatus, updateUserStatus, generateTeacherId, assignTeacherToClasses, getClassLevels, countStudentsByPhone, isDuplicateStudent, getNonStudentByPhone, getUserById, updateLastLogin } from './User.js';
import { getStudentByUserId, createStudent } from '../student/Student.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';
import { sanitizeIdentifier, sanitizeNullableText, sanitizeStringArray, sanitizeText } from '../../utils/sanitize.js';

const router = express.Router();

const JWT_EXPIRY = '24h';

const generateToken = (userId, role, phone) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required but not found in process.env');
  }
  return jwt.sign(
    { userId, role, phone, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return 'Username is required';
  username = username.trim();
  if (username.length < 5) return 'Username must be at least 5 characters';
  if (username.length > 50) return 'Username must be at most 50 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null;
};

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

router.post('/login', async (req, res) => {
  const { phone, identifier, dateOfBirth } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;

  try {
    if (!loginId || !dateOfBirth) {
      return res.status(400).json({ error: 'Phone/Username and date of birth are required' });
    }

    let dobISO;
    const parts = dateOfBirth.split('/');
    if (parts.length === 3) {
      const [dd, mm, yy] = parts;
      const pivotYear = (new Date().getFullYear() % 100) + 10;
      const year = yy.length === 2 ? (parseInt(yy) > pivotYear ? `19${yy}` : `20${yy}`) : yy;
      dobISO = `${year}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
      
      // Semantic validation: Ensure the date actually exists (e.g. Feb 31st is invalid)
      const parsedDate = new Date(dobISO);
      if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dobISO) {
        return res.status(400).json({ error: 'Invalid date of birth' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid date format. Use DD/MM/YY' });
    }

    // Support multiple students sharing the same phone number
    const isPhone = /^\d{10}$/.test(loginId);
    let user, studentData;

    if (isPhone) {
      // Find all student users with this phone and match by DOB
      const allUsers = await getUsersByPhone(pool, loginId);
      const studentUsers = allUsers.filter(u => u.role?.toLowerCase() === 'student');
      if (studentUsers.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

      // Try each student user to find one whose DOB matches
      for (const candidate of studentUsers) {
        if (candidate.status === 'pending') continue;
        if (candidate.status === 'rejected') continue;
        if (candidate.isActive === false) continue;
        
        const dobCheck = await pool.query(
          `SELECT id FROM students WHERE user_id = $1 AND date_of_birth = $2 LIMIT 1`,
          [candidate.id, dobISO]
        );
        if (dobCheck.rows.length > 0) {
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
      user = await getUserByPhoneOrUsername(pool, loginId);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const userRole = user.role ? user.role.toLowerCase() : '';
      if (userRole !== 'student') return res.status(403).json({ error: 'Unauthorized role' });
      if (user.status === 'pending') return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
      if (user.status === 'rejected') return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
      if (user.isActive === false) return res.status(403).json({ error: 'Your account has been deactivated. Please contact admin.' });

      const dobResult = await pool.query(
        `SELECT id FROM students WHERE user_id = $1 AND date_of_birth = $2 LIMIT 1`,
        [user.id, dobISO]
      );
      if (dobResult.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    }

    studentData = await getStudentByUserId(pool, user.id);
    await updateLastLogin(pool, user.id);
    const token = generateToken(user.id, user.role, user.phone);

    res.json({
      success: true,
      token,
      user: { id: user.id, role: user.role, phone: user.phone },
      student: studentData ? {
        id: studentData.id,
        name: studentData.name,
        rollNumber: studentData.roll_number,
        classLevel: studentData.class_level,
      } : null,
      userId: user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/register', async (req, res) => {
  const { role, phone, password, confirmPassword } = req.body;
  const pool = req.db;

  try {
    const normalizedRole = role || ((req.body.firstName || req.body.lastName || req.body.dateOfBirth) ? 'student' : 'teacher');
    const username = sanitizeIdentifier(req.body.username, 50);
    const sanitizedPhone = sanitizeIdentifier(phone, 15);
    const sanitizedEmail = sanitizeNullableText(req.body.email, 255);
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeIdentifier(req.body.section, 10) || 'A';
    const fatherName = sanitizeNullableText(req.body.fatherName || req.body.father_name, 100);
    const motherName = sanitizeNullableText(req.body.motherName || req.body.mother_name, 100);

    if (username) {
      const usernameError = validateUsername(username);
      if (usernameError) return res.status(400).json({ error: usernameError });
      if (await isUsernameTaken(pool, username)) return res.status(409).json({ error: 'Username already taken' });
    }

    if (normalizedRole === 'student' && (!sanitizedPhone || !req.body.dateOfBirth)) {
      return res.status(400).json({ error: 'Phone and Date of Birth are required' });
    }

    if (normalizedRole !== 'student' && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (normalizedRole !== 'student') {
      if (await getUserByPhone(pool, sanitizedPhone)) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    } else {
      const studentCount = await countStudentsByPhone(pool, sanitizedPhone);
      if (studentCount >= 4) {
        return res.status(409).json({ error: 'Maximum 4 students can register with the same phone number' });
      }
      if (await getNonStudentByPhone(pool, sanitizedPhone)) {
        return res.status(409).json({ error: 'Phone number already registered to a non-student account' });
      }
    }

    if (normalizedRole === 'student') {
      const { dateOfBirth } = req.body;
      const fullName = sanitizeText(req.body.name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(), 100);

      if (dateOfBirth && classLevel) {
        let dobISO_check = null;
        const dparts = dateOfBirth.split('/');
        if (dparts.length === 3) {
          const [dd, mm, yy] = dparts;
          const pivotYear = (new Date().getFullYear() % 100) + 10;
          const year = yy.length === 2 ? (parseInt(yy) > pivotYear ? `19${yy}` : `20${yy}`) : yy;
          dobISO_check = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
          
          // Semantic validation
          const parsedDate = new Date(dobISO_check);
          if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dobISO_check) {
            return res.status(400).json({ error: 'Invalid date of birth' });
          }
        } else {
          return res.status(400).json({ error: 'Invalid date format for DOB. Use DD/MM/YY' });
        }
        if (dobISO_check && await isDuplicateStudent(pool, sanitizedPhone, fullName, classLevel.toString(), dobISO_check, fatherName, motherName)) {
          return res.status(409).json({ error: 'A student with the same details is already registered' });
        }
      }
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Use a deterministic advisory lock key based on class+section to avoid
        // table-wide locks while still serializing roll-number generation per class.
        const lockKey = parseInt(classLevel.toString().replace(/\D/g, '') || '0') * 1000 +
          section.toUpperCase().charCodeAt(0);
        await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

        const user = await createUser(client, {
          name: fullName,
          phone: sanitizedPhone,
          email: sanitizedEmail || `${sanitizedPhone}@student.local`,
          password: crypto.randomBytes(32).toString('hex'),
          role: 'student',
          schoolId: 'school-001',
          username: username || null,
        });

        if (!username) {
          await client.query('UPDATE users SET username = $1 WHERE id = $2', [`user_${user.id}`, user.id]);
        }

        const classPart = classLevel.toString().padStart(2, '0');
        const sectionPart = section.toUpperCase();
        const prefix = `${classPart}${sectionPart}`;

        const maxResult = await client.query(
          `SELECT MAX(CAST(SUBSTRING(roll_number, $2) AS INTEGER)) AS max_num
           FROM students
           WHERE roll_number ~ ('^' || $1 || '[0-9]{3}$')`,
          [prefix, (prefix.length + 1).toString()]
        );
        const nextNum = (maxResult.rows[0].max_num || 0) + 1;
        const rollNumber = `${prefix}${nextNum.toString().padStart(3, '0')}`;

        let dobISO = dobISO_check; // Reuse validated DOB from above

        const student = await createStudent(client, {
          userId: user.id,
          name: fullName,
          classLevel: classLevel.toString(),
          section,
          fatherName,
          motherName,
          phone: sanitizedPhone,
          email: user.email,
          joiningDate: new Date().toISOString().split('T')[0],
          dateOfBirth: dobISO,
          status: 'active',
          rollNumber,
          schoolId: 'school-001',
        });

        await updateLastLogin(client, user.id);
        await client.query('COMMIT');
        const token = generateToken(user.id, user.role, sanitizedPhone);

        return res.json({
          success: true,
          token,
          user: { id: user.id, phone: user.phone, role: user.role, username: username || `user_${user.id}` },
          student: { id: student.id, name: student.name, rollNumber: student.roll_number, classLevel: student.class_level },
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (normalizedRole === 'teacher' || normalizedRole === 'staff') {
      const teacherId = await generateTeacherId(pool, normalizedRole);
      const user = await createUser(pool, {
        name: sanitizeText(req.body.name, 100),
        phone: sanitizedPhone,
        email: sanitizedEmail,
        password,
        role: normalizedRole,
        schoolId: 'school-001',
        teacherId,
        username: username || null,
      });

      if (!username) await pool.query('UPDATE users SET username = $1 WHERE id = $2', [`user_${user.id}`, user.id]);
      await updateLastLogin(pool, user.id);
      const token = generateToken(user.id, user.role, sanitizedPhone);

      return res.json({
        success: true,
        message: 'Registration successful. Awaiting admin approval.',
        token,
        user: { id: user.id, phone: user.phone, role: user.role, status: user.status, teacherId: user.teacherId, username: username || `user_${user.id}` },
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/admin-login', async (req, res) => {
  const { phone, identifier, password } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;
  try {
    if (!loginId || !password) return res.status(400).json({ error: 'Phone/Username and password are required' });
    const user = await getUserByPhoneOrUsername(pool, loginId, true);
    if (!user || user.role.toLowerCase() !== 'admin') return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isActive === false) return res.status(403).json({ error: 'This admin account has been deactivated.' });
    
    await updateLastLogin(pool, user.id);
    const token = generateToken(user.id, user.role, user.phone);
    res.json({ success: true, token, user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/teacher-login', async (req, res) => {
  const { phone, identifier, password } = req.body;
  const loginId = sanitizeIdentifier(identifier || phone, 50);
  const pool = req.db;
  try {
    if (!loginId || !password) return res.status(400).json({ error: 'Phone/Username and password are required' });
    const user = await getUserByPhoneOrUsername(pool, loginId, true);
    if (!user || (user.role.toLowerCase() !== 'teacher' && user.role.toLowerCase() !== 'staff')) return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    if (user.status !== 'active' || !user.isActive) return res.status(403).json({ error: 'Account not active' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    
    await updateLastLogin(pool, user.id);
    const token = generateToken(user.id, user.role, user.phone);
    res.json({ success: true, token, user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/admin/pending-users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await getUsersByStatus(req.db, 'pending', 'school-001');
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
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid User ID format' });
    }

    const user = await getUserById(req.db, id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.status === 'active') {
      return res.status(400).json({ success: false, error: 'User is already approved' });
    }

    // Assign classes if applicable
    if ((user.role === 'teacher' || user.role === 'staff') && classesAssigned) {
      if (!Array.isArray(classesAssigned)) {
        return res.status(400).json({ success: false, error: 'classesAssigned must be an array' });
      }
      await assignTeacherToClasses(req.db, id, classesAssigned, user.schoolId);
    }

    const updatedUser = await updateUserStatus(req.db, id, 'active', req.user.userId);
    
    console.log(`[AUTH] Admin ${req.user.userId} approved user ${id} (${user.role})`);
    
    res.json({ 
      success: true, 
      message: 'User approved successfully', 
      user: updatedUser,
      data: updatedUser 
    });
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
  try {
    const updatedUser = await updateUserStatus(req.db, parseInt(userId), 'rejected', null, reason || 'Admin rejection');
    res.json({ success: true, message: 'User rejected', user: updatedUser, data: updatedUser });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ success: false, error: 'Server error rejecting user' });
  }
});

router.get('/admin/class-levels', authenticate, authorize('admin'), async (req, res) => {
  try {
    const classLevels = await getClassLevels(req.db, 'school-001');
    res.json({ success: true, classLevels });
  } catch (error) {
    console.error('Error fetching class levels:', error);
    res.status(500).json({ error: 'Server error fetching class levels' });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
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

export default router;

import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getUserByPhone, getUsersByPhone, getUserByPhoneOrUsername, isUsernameTaken, createUser, getApprovedUser, getUsersByStatus, updateUserStatus, generateTeacherId, assignTeacherToClasses, getClassLevels, countStudentsByPhone, isDuplicateStudent, getNonStudentByPhone } from './User.js';
import { getStudentByUserId, createStudent } from '../student/Student.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';
import { sanitizeIdentifier, sanitizeNullableText, sanitizeStringArray, sanitizeText } from '../../utils/sanitize.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
const JWT_EXPIRY = '24h';

const generateToken = (userId, role, phone) => {
  return jwt.sign(
    { userId, role, phone, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
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
      const year = yy.length === 2 ? (parseInt(yy) > 30 ? `19${yy}` : `20${yy}`) : yy;
      dobISO = `${year}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
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
          `SELECT id FROM students WHERE "userId" = $1 AND "dateOfBirth" = $2 LIMIT 1`,
          [candidate.id, dobISO]
        );
        if (dobCheck.rows.length > 0) {
          user = candidate;
          break;
        }
      }
      if (!user) {
        // Check if all candidates are pending/rejected/inactive for a better error message
        const pending = studentUsers.find(u => u.status === 'pending');
        if (pending) return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
        const rejected = studentUsers.find(u => u.status === 'rejected');
        if (rejected) return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      // Username login - single user lookup
      user = await getUserByPhoneOrUsername(pool, loginId);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const userRole = user.role ? user.role.toLowerCase() : '';
      if (userRole !== 'student') return res.status(403).json({ error: 'Unauthorized role' });
      if (user.status === 'pending') return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
      if (user.status === 'rejected') return res.status(403).json({ error: 'Your account has been rejected. Please contact admin.' });
      if (user.isActive === false) return res.status(403).json({ error: 'Your account has been deactivated. Please contact admin.' });

      const dobResult = await pool.query(
        `SELECT id FROM students WHERE "userId" = $1 AND "dateOfBirth" = $2 LIMIT 1`,
        [user.id, dobISO]
      );
      if (dobResult.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    }

    studentData = await getStudentByUserId(pool, user.id);
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

    // Phone uniqueness: strict for non-students, allow up to 4 for students
    if (normalizedRole !== 'student') {
      if (await getUserByPhone(pool, sanitizedPhone)) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    } else {
      const studentCount = await countStudentsByPhone(pool, sanitizedPhone);
      if (studentCount >= 4) {
        return res.status(409).json({ error: 'Maximum 4 students can register with the same phone number' });
      }
      // Also block if a non-student (admin/teacher/staff) already has this phone
      if (await getNonStudentByPhone(pool, sanitizedPhone)) {
        return res.status(409).json({ error: 'Phone number already registered to a non-student account' });
      }
    }

    // STUDENT REGISTRATION - WITH ATOMIC ROLL NUMBER LOCK
    if (normalizedRole === 'student') {
      const { dateOfBirth } = req.body;
      const fullName = sanitizeText(req.body.name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(), 100);

      // Reject exact duplicate: same phone + name + class + DOB
      if (dateOfBirth && classLevel) {
        let dobISO_check = null;
        const dparts = dateOfBirth.split('/');
        if (dparts.length === 3) {
          const [dd, mm, yy] = dparts;
          const year = yy.length === 2 ? (parseInt(yy) > 30 ? `19${yy}` : `20${yy}`) : yy;
          dobISO_check = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
        if (dobISO_check && await isDuplicateStudent(pool, sanitizedPhone, fullName, classLevel.toString(), dobISO_check, fatherName, motherName)) {
          return res.status(409).json({ error: 'A student with the same details is already registered' });
        }
      }
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // LOCK TABLE to prevent concurrent roll number generation collisions
        await client.query('LOCK TABLE students IN ACCESS EXCLUSIVE MODE');

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

        const countResult = await client.query(
          `SELECT COUNT(*) FROM students WHERE "rollNumber" LIKE $1`,
          [`${prefix}%`]
        );
        const rollNumber = `${prefix}${(parseInt(countResult.rows[0].count) + 1).toString().padStart(3, '0')}`;

        let dobISO = null;
        if (dateOfBirth) {
          const parts = dateOfBirth.split('/');
          const [dd, mm, yy] = parts;
          const year = yy.length === 2 ? (parseInt(yy) > 30 ? `19${yy}` : `20${yy}`) : yy;
          dobISO = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }

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

    // TEACHER/STAFF REGISTRATION
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
    const user = await getUserByPhoneOrUsername(pool, loginId);
    if (!user || user.role.toLowerCase() !== 'admin') return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isActive === false) return res.status(403).json({ error: 'This admin account has been deactivated.' });

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
    const user = await getUserByPhoneOrUsername(pool, loginId);
    if (!user || user.role.toLowerCase() !== 'teacher') return res.status(403).json({ error: 'Invalid credentials or unauthorized' });
    if (user.status !== 'active' || !user.isActive) return res.status(403).json({ error: 'Account not active' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

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
  try {
    const userResult = await req.db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if ((user.role === 'teacher' || user.role === 'staff') && classesAssigned) {
      await assignTeacherToClasses(req.db, userId, classesAssigned, user.schoolId);
    }
    const updatedUser = await updateUserStatus(req.db, parseInt(userId), 'active', null);
    res.json({ success: true, message: 'User approved', data: updatedUser });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ success: false, error: 'Server error approving user' });
  }
});

router.post('/admin/reject-user/:userId', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  try {
    const updatedUser = await updateUserStatus(req.db, parseInt(userId), 'rejected', null, reason || 'Admin rejection');
    res.json({ success: true, message: 'User rejected', data: updatedUser });
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

export default router;

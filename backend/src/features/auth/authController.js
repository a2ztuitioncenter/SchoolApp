// authController.js - Authentication logic
import { createUser, getUserByPhone } from './User.js';
import { getStudentByUserId, createStudent } from '../student/Student.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tuition-app-dev-secret-key-change-in-production';
const JWT_EXPIRY = '24h'; // Token expires in 24 hours

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

// Mock login - bypasses OTP for development
export const mockLogin = async (req, res) => {
  const { phone, role } = req.body;

  if (!phone || !role) {
    return res.status(400).json({
      error: 'Phone and role are required',
    });
  }

  try {
    const pool = req.db;

    // Check if user already exists
    let user = await getUserByPhone(pool, phone);

    if (!user) {
      // Normalize role
      const normalizedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Student';
      // Create new user
      user = await createUser(pool, {
        phone,
        role: normalizedRole,
        schoolId: 'school-001', // Default school ID for development
      });

      // If student, create student record
      if (normalizedRole === 'Student') {
        await createStudent(pool, {
          userId: user.id,
          name: 'New Student',
          classLevel: '10A',
          section: 'A',
          fatherName: 'Father Name',
          motherName: 'Mother Name',
          phone,
          email: `student.${phone}@a2z.local`,
          joiningDate: new Date().toISOString().split('T')[0],
          status: 'active',
          rollNumber: Math.floor(Math.random() * 100).toString(),
          schoolId: 'school-001',
        });
      }
    }

    // Get student details if role is student
    let studentData = null;
    const normalizedRole = user.role || role;
    if (normalizedRole === 'Student') {
      studentData = await getStudentByUserId(pool, user.id);
    }

    // Generate JWT token
    const token = generateToken(user.id, normalizedRole, phone);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      userId: user.id,
      role: normalizedRole,
      user: {
        id: user.id,
        phone,
        role: normalizedRole,
      },
      student: studentData,
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message,
    });
  }
};

// Verify token (JWT implementation)
export const verifyToken = async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      valid: true,
      userId: decoded.userId,
      role: decoded.role,
      expiresIn: JWT_EXPIRY
    });
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(401).json({ error: 'Invalid token' });
  }
};

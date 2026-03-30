// authController.js - Authentication logic
import { createUser, getUserByPhone } from './User.js';
import { getStudentByUserId, createStudent } from '../student/Student.js';

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

    // Return mock session token (JWT in production)
    const token = Buffer.from(`${user.id}:${role}`).toString('base64');

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      userId: user.id,
      role,
      user: {
        id: user.id,
        phone,
        role,
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

// Verify token (mock implementation for development)
export const verifyToken = async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // In production, use JWT.verify()
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role] = decoded.split(':');

    res.json({
      valid: true,
      userId,
      role,
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

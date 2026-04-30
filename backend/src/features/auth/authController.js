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

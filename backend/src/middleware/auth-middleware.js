/**
 * auth-middleware.js - Backend authentication and authorization middleware
 * Protects routes from unauthorized access
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tuition-app-dev-secret-key-change-in-production';

/**
 * Authentication Middleware - Verify JWT token
 * Extracts and validates token from Authorization header
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized: No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      phone: decoded.phone,
      timestamp: decoded.iat
    };

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Unauthorized: Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Authorization Middleware - Check user role
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // First verify user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized: Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      console.warn(`⚠️ Authorization failed: User role '${userRole}' not in allowed roles [${roles.join(', ')}]`);
      return res.status(403).json({ 
        error: `Forbidden: User role '${userRole}' does not have access to this resource`,
        code: 'FORBIDDEN',
        requiredRoles: roles,
        userRole: userRole
      });
    }

    next();
  };
};

/**
 * Ownership Check Middleware - Ensure user can only access their own data
 * @param {string} paramName - Name of the parameter containing the userId/resourceId
 * @param {function} [getOwnerId] - Optional function to extract owner ID (for complex scenarios)
 */
export const checkOwnership = (paramName = 'userId', getOwnerId = null) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized: Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    let resourceOwnerId;
    
    if (getOwnerId && typeof getOwnerId === 'function') {
      // Use custom function to extract owner ID (e.g., from database)
      resourceOwnerId = getOwnerId(req);
    } else {
      // Extract from route params
      resourceOwnerId = req.params[paramName];
    }

    const requestingUserId = req.user.userId;

    // Allow admins to access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // For non-admin users, check ownership
    if (resourceOwnerId && String(resourceOwnerId) !== String(requestingUserId)) {
      console.warn(`⚠️ Ownership check failed: User ${requestingUserId} tried to access resource owned by ${resourceOwnerId}`);
      return res.status(403).json({ 
        error: 'Forbidden: You can only access your own data',
        code: 'OWNERSHIP_VIOLATION'
      });
    }

    next();
  };
};

/**
 * Rate Limiting Middleware - Prevent brute force attacks
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
const requestCounts = {}; // Store request counts per IP/user

export const rateLimiter = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const identifier = req.user?.userId || req.ip; // Use userId if authenticated, else IP
    const now = Date.now();
    
    if (!requestCounts[identifier]) {
      requestCounts[identifier] = [];
    }

    // Remove old requests outside the window
    requestCounts[identifier] = requestCounts[identifier].filter(
      timestamp => now - timestamp < windowMs
    );

    if (requestCounts[identifier].length >= maxRequests) {
      console.warn(`⚠️ Rate limit exceeded for ${identifier}`);
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    requestCounts[identifier].push(now);
    
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - requestCounts[identifier].length);
    
    next();
  };
};

/**
 * Input Validation Middleware - Prevent injection attacks
 */
export const validateInput = (req, res, next) => {
  // Check for suspicious patterns in query strings and body
  const checkForSuspiciousPatterns = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    // Use Object.entries for safer iteration especially with null-prototype objects
    const entries = Array.isArray(obj) ? obj.map((v, i) => [i, v]) : Object.entries(obj);
    
    for (const [key, value] of entries) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        // Check for SQL injection patterns
        if (/(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bSELECT\b|--|;|\/\*|\*\/|'|")/gi.test(value)) {
          console.warn(`⚠️ Suspicious input detected in ${fullPath}: ${value.substring(0, 50)}`);
          throw new Error(`Suspicious input in field: ${fullPath}`);
        }
      } else if (value && typeof value === 'object') {
        checkForSuspiciousPatterns(value, fullPath);
      }
    }
  };

  try {
    if (req.body && typeof req.body === 'object') {
      checkForSuspiciousPatterns(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      checkForSuspiciousPatterns(req.query);
    }
    
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Invalid input: ' + error.message,
      code: 'INVALID_INPUT'
    });
  }
};

/**
 * CORS Security Middleware
 * Restrict API access to trusted origins
 */
export const corsSecure = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8000'
  ];

  return (req, res, next) => {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Prevent MIME type sniffing
    res.header('X-Content-Type-Options', 'nosniff');
    // Enable XSS protection
    res.header('X-XSS-Protection', '1; mode=block');
    // Prevent clickjacking
    res.header('X-Frame-Options', 'DENY');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  };
};

/**
 * Logging Middleware - Log all API requests for security audit
 */
export const securityLogger = (req, res, next) => {
  const userId = req.user?.userId || 'ANONYMOUS';
  const userRole = req.user?.role || 'GUEST';
  
  console.log(`🔐 [AUTH] User: ${userId} | Role: ${userRole} | ${req.method} ${req.path}`);
  
  next();
};

export default {
  authenticate,
  authorize,
  checkOwnership,
  rateLimiter,
  validateInput,
  corsSecure,
  securityLogger
};

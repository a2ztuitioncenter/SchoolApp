# Backend Security Implementation

## Overview
Comprehensive backend authentication and authorization system protects all API endpoints from unauthorized access and hacking threats.

## 🔐 Security Features Implemented

### 1. JWT Token Authentication
- **File**: `backend/src/features/auth/authController.js` and `authRoutes.js`
- **Implementation**: Secure JWT tokens instead of base64 encoding
- **Expiry**: 24 hours
- **Secret**: Stored in JWT_SECRET environment variable

```js
// Generate token on login
const token = jwt.sign(
  { userId, role, phone, iat: Date.now() },
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

### 2. Authentication Middleware
- **File**: `backend/src/middleware/auth-middleware.js`
- **Function**: `authenticate` - Verifies JWT token from Authorization header
- **Requirement**: All protected routes must include token in header:
  ```
  Authorization: Bearer <token>
  ```

### 3. Role-Based Authorization (RBAC)
- **Function**: `authorize(allowedRoles)`
- **Application**: Ensures only users with correct role can access endpoints
- **Roles**: `'student'`, `'teacher'`, `'admin'`

**Example Usage:**
```js
app.use('/api/admin', authenticate, authorize('admin'), adminRoutes);
app.use('/api/teacher', authenticate, authorize('teacher'), teacherRoutes);
app.use('/api/student', authenticate, studentRoutes);
```

### 4. Ownership Checks
- **Function**: `checkOwnership(paramName)`
- **Purpose**: Ensures users can only access their own data
- **Protection**: Students cannot access other students' data

### 5. Rate Limiting
- **Function**: `rateLimiter(maxRequests, windowMs)`
- **Current**: 100 requests per minute
- **Protection**: Prevents brute force attacks

### 6. Input Validation
- **Function**: `validateInput`
- **Checks**: SQL injection patterns, suspicious characters
- **Protection**: Blocks malicious input attempts

### 7. CORS Security
- **Function**: `corsSecure()`
- **Whitelist**: Only allows requests from known frontend origins
- **Headers**: Sets security headers (X-Content-Type-Options, X-XSS-Protection, X-Frame-Options)

### 8. Security Logging
- **Function**: `securityLogger`
- **Logs**: All API requests with user ID, role, method, and path
- **Audit Trail**: Security events tracked for investigation

## 🛡️ Protected Endpoints

### Public Endpoints (No Auth Required)
- `POST /api/auth/login` - Student login
- `POST /api/auth/register` - Student registration
- `POST /api/auth/admin-login` - Admin login
- `POST /api/auth/teacher-login` - Teacher login
- `POST /api/auth/teacher-register` - Teacher registration
- `GET /health` - Health check

### Protected Endpoints (Auth Required)

#### Student Routes
- `GET /api/student/:userId/dashboard` - Requires `student` role + ownership
- `GET /api/student/:userId/attendance` - Requires `student` role + ownership
- `GET /api/student/:userId/fees` - Requires `student` role + ownership
- `GET /api/student/:userId/homework` - Requires `student` role + ownership

#### Admin Routes
- `GET /api/admin/*` - All admin routes require `admin` role
- `POST /api/admin/approve-user/:userId` - Requires `admin` role
- `POST /api/admin/reject-user/:userId` - Requires `admin` role

#### Teacher Routes
- `GET /api/teacher/*` - All teacher routes require `teacher` role
- `POST /api/teacher/*` - All teacher routes require `teacher` role

## 🚀 Integration with Frontend

### 1. Store Token on Login
Frontend `auth-manager.js` already stores token via `setAuth()`:
```js
setAuth({
  role: 'student',
  userId: response.userId,
  name: response.student?.name,
  phone: phone
});
```

**The backend returns the JWT token in login response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": 1, "role": "student", "phone": "9876543210" }
}
```

### 2. Send Token with API Requests
Update `frontend/src/core/api.js` to include token in all requests:

```js
const apiCall = async (endpoint, options = {}) => {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  const token = auth.token;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(API_BASE_URL + endpoint, {
    ...options,
    headers
  });
  
  // ... rest of implementation
};
```

### 3. Handle Token Expiration
When backend returns 401 (Unauthorized/Token Expired):
```js
if (response.status === 401) {
  // Token expired - clear auth and redirect to login
  clearAuth();
  window.location.href = '/';
}
```

## 📋 Security Checklist

### Backend
- ✅ JWT authentication on all protected routes
- ✅ Role-based authorization
- ✅ Rate limiting (100 requests/minute)
- ✅ Input validation (SQL injection prevention)
- ✅ CORS security headers
- ✅ Ownership verification
- ✅ Security logging

### Frontend
- ✅ Route protection (`requireRole()`)
- ✅ Auth state management
- ✅ Logout functionality
- ✅ Session timeout (24 hours)
- ⚠️ **NEEDS UPDATE**: Token inclusion in API requests

### Environment
- ⚠️ **TODO**: Set `JWT_SECRET` in `.env` file
- ⚠️ **TODO**: Set `FRONTEND_URL` in `.env` for CORS whitelist
- ⚠️ **TODO**: Configure .env securely (never commit!)

## ⚙️ Configuration

### Environment Variables
```env
PORT=3000
JWT_SECRET=your-very-secure-secret-key-here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development|production
```

### .env File Location
```
backend/.env
```

**CRITICAL**: Never commit `.env` file to version control!

## 🔍 Security Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 400 | Bad Request | Check input validation |
| 401 | Unauthorized | No token or invalid token - redirect to login |
| 403 | Forbidden | Insufficient permissions - check role |
| 429 | Rate Limited | Too many requests - wait and retry |
| 500 | Server Error | Server issue |

## 📝 Error Response Format

```json
{
  "error": "Unauthorized: No token provided",
  "code": "NO_TOKEN"
}
```

Error codes:
- `NO_TOKEN` - Missing Authorization header
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_TOKEN` - Token signature invalid
- `FORBIDDEN` - Role-based access denied
- `OWNERSHIP_VIOLATION` - User trying to access another user's data
- `RATE_LIMIT_EXCEEDED` - Too many requests from this user/IP

## 🛠️ Testing Authentication

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"student123"}'
```

Response includes `token`.

### 2. Use Token
```bash
curl -X GET http://localhost:3000/api/student/1/dashboard \
  -H "Authorization: Bearer eyJhbGc..."
```

### 3. Without Token (Should Fail)
```bash
curl -X GET http://localhost:3000/api/student/1/dashboard
# Returns 401 Unauthorized
```

### 4. Wrong Role (Should Fail)
```bash
# Student trying to access admin endpoint
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <student-token>"
# Returns 403 Forbidden
```

## 🚨 Common Issues

### Issue: "No token provided"
**Solution**: Ensure frontend includes token in Authorization header

### Issue: "Token expired"
**Solution**: Implement token refresh endpoint or require re-login

### Issue: "Invalid token"
**Solution**: Check JWT_SECRET matches between login and verification

### Issue: "Rate limit exceeded"
**Solution**: Wait 60 seconds before retrying

## 📚 Next Steps

1. ✅ Backend auth middleware implemented
2. ⚠️ **TODO**: Update frontend `api.js` to send token in requests
3. ⚠️ **TODO**: Configure `.env` with JWT_SECRET
4. ⚠️ **TODO**: Test all endpoints with auth
5. ⚠️ **TODO**: Implement token refresh mechanism
6. ⚠️ **TODO**: Set up HTTPS in production
7. ⚠️ **TODO**: Implement audit logging

## 🔐 Production Recommendations

1. **Use HTTPS Only** - All API calls must use HTTPS
2. **Secure JWT Secret** - Use strong, randomly generated secret
3. **Token Refresh** - Implement refresh tokens for extended sessions
4. **HTTPS Certificates** - Use proper SSL/TLS certificates
5. **CORS Whitelist** - Restrict to specific frontend domains
6. **Rate Limiting** - Adjust based on usage patterns
7. **Logging** - Store security logs for audit trails
8. **Monitoring** - Alert on suspicious patterns
9. **Database** - Ensure sensitive data is encrypted
10. **Backup** - Regular security backups

## 📞 Security Contact

For security issues or vulnerabilities, please report privately.

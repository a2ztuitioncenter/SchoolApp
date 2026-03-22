# 📡 API Reference Documentation

## Base URL
```
http://localhost:3000/api
```

---

## Authentication Endpoints

### 1. Student Login
**POST** `/auth/login`

Login a student using phone number (mock OTP for development)

**Request Body:**
```json
{
  "phone": "9999999991",
  "role": "student"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "MTozdHVkZW50",
  "userId": 1,
  "role": "student",
  "user": {
    "id": 1,
    "phone": "9999999991",
    "role": "student"
  },
  "student": {
    "id": 1,
    "userId": 1,
    "name": "Rajesh Kumar",
    "classLevel": "10A",
    "section": "A",
    "rollNumber": "ROLL-0001",
    "email": "student1@academy.local",
    "phone": "9999999991",
    "status": "active"
  }
}
```

**Error Response:**
```json
{
  "error": "Login failed",
  "message": "Phone and role are required"
}
```

**Status Codes:**
- `200` - Login successful
- `400` - Invalid request (missing phone or role)
- `500` - Server error

---

### 2. Verify Token
**POST** `/auth/verify`

Verify if the authentication token is valid

**Request Headers:**
```
Authorization: Bearer MTozdHVkZW50
```

**Response (Valid Token):**
```json
{
  "valid": true,
  "userId": 1,
  "role": "student"
}
```

**Response (Invalid Token):**
```json
{
  "error": "Invalid token"
}
```

**Status Codes:**
- `200` - Token is valid
- `401` - Token missing or invalid

---

## Student Data Endpoints

### 3. Get Student Dashboard
**GET** `/student/:userId/dashboard`

Fetch complete dashboard data including profile, attendance, fees, homework, and progress

**URL Parameters:**
- `userId` (required) - Student's user ID

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1,
      "userId": 1,
      "name": "Rajesh Kumar",
      "classLevel": "10A",
      "section": "A",
      "fatherName": "Father Name",
      "motherName": "Mother Name",
      "rollNumber": "ROLL-0001",
      "email": "student1@academy.local",
      "phone": "9999999991"
    },
    "attendance": {
      "presentDays": 20,
      "absentDays": 10,
      "totalDays": 30,
      "percentage": 67,
      "summary": {
        "present": 20,
        "absent": 10,
        "late": 0,
        "leave": 0
      }
    },
    "fees": {
      "totalAmount": 15000.00,
      "totalPaid": 10000.00,
      "totalPending": 5000.00,
      "pendingCount": 1,
      "paidCount": 2,
      "fees": [
        {
          "id": 1,
          "studentId": 1,
          "amount": "5000.00",
          "dueDate": "2024-01-15",
          "paidDate": null,
          "isPaid": false,
          "month": "January",
          "academicYear": "2024-2025"
        }
      ]
    },
    "homework": [
      {
        "id": "hw-001",
        "subject": "Mathematics",
        "topic": "Algebra - Equations",
        "dueDate": "2025-03-30",
        "status": "pending"
      }
    ],
    "courseProgress": {
      "percentage": 75,
      "completedLessons": 15,
      "totalLessons": 20
    }
  }
}
```

**Error Response:**
```json
{
  "error": "Failed to fetch dashboard data",
  "message": "Student record not found"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing userId
- `404` - Student not found
- `500` - Server error

---

### 4. Get Student Attendance
**GET** `/student/:userId/attendance`

Fetch attendance records and statistics for a student

**URL Parameters:**
- `userId` (required) - Student's user ID

**Query Parameters (Optional):**
- `startDate` - Start date for attendance records (YYYY-MM-DD)
- `endDate` - End date for attendance records (YYYY-MM-DD)

**Example:**
```
GET /student/1/attendance?startDate=2024-10-01&endDate=2024-10-31
```

**Response (Success):**
```json
{
  "success": true,
  "studentId": 1,
  "name": "Rajesh Kumar",
  "summary": {
    "presentDays": 20,
    "absentDays": 10,
    "totalWorkingDays": 30,
    "percentage": 67
  },
  "attendanceSummary": {
    "present": 20,
    "absent": 10,
    "late": 0,
    "leave": 0
  },
  "records": [
    {
      "id": 1,
      "studentId": 1,
      "attendanceDate": "2024-10-20",
      "status": "present",
      "remarks": null
    },
    {
      "id": 2,
      "studentId": 1,
      "attendanceDate": "2024-10-21",
      "status": "absent",
      "remarks": "Sick leave"
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "Failed to fetch attendance data",
  "message": "Student not found"
}
```

**Status Codes:**
- `200` - Success
- `404` - Student not found
- `500` - Server error

---

### 5. Get Student Fees
**GET** `/student/:userId/fees`

Fetch fee records and payment status for a student

**URL Parameters:**
- `userId` (required) - Student's user ID

**Response (Success):**
```json
{
  "success": true,
  "studentId": 1,
  "name": "Rajesh Kumar",
  "summary": {
    "totalRecords": 3,
    "totalAmount": "15000.00",
    "totalPaid": "10000.00",
    "totalPending": "5000.00",
    "paidCount": 2,
    "pendingCount": 1
  },
  "fees": [
    {
      "id": 1,
      "studentId": 1,
      "userId": 1,
      "amount": "5000.00",
      "dueDate": "2024-01-15",
      "paidDate": null,
      "isPaid": false,
      "paymentMethod": null,
      "month": "January",
      "academicYear": "2024-2025",
      "schoolId": "school-001",
      "notes": null
    },
    {
      "id": 2,
      "studentId": 1,
      "userId": 1,
      "amount": "5000.00",
      "dueDate": "2024-02-15",
      "paidDate": "2024-02-10",
      "isPaid": true,
      "paymentMethod": "online",
      "month": "February",
      "academicYear": "2024-2025",
      "receiptNumber": "RCP-001",
      "schoolId": "school-001",
      "notes": "Paid via online"
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "Failed to fetch fee data",
  "message": "Student not found"
}
```

**Status Codes:**
- `200` - Success
- `404` - Student not found
- `500` - Server error

---

## Health Check Endpoint

### 6. Server Health Check
**GET** `/health`

Check if the server is running

**Response:**
```json
{
  "status": "Server is running",
  "timestamp": "2024-10-22T10:30:45.123Z"
}
```

**Status Code:**
- `200` - Server is healthy

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error title",
  "message": "Detailed error message (only in development mode)"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Data fetched successfully |
| 400 | Bad Request | Missing required parameters |
| 401 | Unauthorized | Invalid or missing token |
| 404 | Not Found | Student or resource not found |
| 500 | Server Error | Database connection failed |

---

## Request Examples

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999999991","role":"student"}'
```

**Get Dashboard:**
```bash
curl -X GET http://localhost:3000/api/student/1/dashboard \
  -H "Authorization: Bearer MTozdHVkZW50"
```

**Get Attendance with Date Range:**
```bash
curl -X GET "http://localhost:3000/api/student/1/attendance?startDate=2024-10-01&endDate=2024-10-31"
```

### Using JavaScript (Fetch API)

**Login:**
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '9999999991', role: 'student' })
});
const data = await response.json();
```

**Get Dashboard:**
```javascript
const response = await fetch('http://localhost:3000/api/student/1/dashboard', {
  headers: { 'Authorization': 'Bearer MTozdHVkZW50' }
});
const data = await response.json();
```

### Using Postman

1. Create new collection "Tuition App"
2. Add requests:
   - **login**: POST to `/api/auth/login` with body
   - **dashboard**: GET to `/api/student/1/dashboard`
   - **attendance**: GET to `/api/student/1/attendance`
   - **fees**: GET to `/api/student/1/fees`
3. Use auth token from login response in header for other requests

---

## Database Relationships

```
users (1) ──── (1) students
  │
  └── (N) fees
  └── (N) attendance

students (1) ──── (N) fees
  │
  └── (N) attendance
```

---

## Notes

- All timestamps are in ISO 8601 format
- Monetary amounts are in Indian Rupees (INR)
- Phone numbers must be 10 digits
- Dates must be in YYYY-MM-DD format
- All IDs are integers starting from 1
- Development mode returns detailed error messages
- Production mode hides sensitive error information

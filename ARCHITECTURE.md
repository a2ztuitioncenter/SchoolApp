# 🏗️ Project Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER (Port 8000)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  index.html  │  │student.html  │  │   style.css  │           │
│  │  (Login)     │  │ (Dashboard)  │  │  (Styling)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         ▲                  ▲                                       │
│         │ JS Modules       │ HTML/DOM                            │
│  ┌──────┴──────────────────┴──────────────────────────────────┐  │
│  │                   Frontend (JavaScript)                     │  │
│  │  ┌──────────── api.js ──────────────┐                      │  │
│  │  │ - setAuthToken()                 │                      │  │
│  │  │ - apiCall()                      │                      │  │
│  │  │ - authAPI.login()                │                      │  │
│  │  │ - studentAPI.getDashboard()      │                      │  │
│  │  └──────────────────────────────────┘                      │  │
│  │  ┌──────────── auth.js ──────────────┐                     │  │
│  │  │ - handleStudentLogin()            │                     │  │
│  │  │ - Form submission handler         │                     │  │
│  │  └──────────────────────────────────┘                      │  │
│  │  ┌──────────── dashboard.js ──────────┐                    │  │
│  │  │ - loadDashboardData()             │                    │  │
│  │  │ - populateProfile()               │                    │  │
│  │  │ - populateAttendance()            │                    │  │
│  │  │ - populateFees()                  │                    │  │
│  │  └──────────────────────────────────┘                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                         │
│         │ HTTP (JSON)                                            │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │ REST API Calls
          │ (POST /api/auth/login, GET /api/student/:id/dashboard)
          │
┌─────────▼───────────────────────────────────────────────────────┐
│               EXPRESS SERVER (Port 3000)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Middleware Stack                          │ │
│  │  - express.json()     (Parse JSON requests)               │ │
│  │  - cors()             (Allow cross-origin)                │ │
│  │  - (req.db = pool)    (Inject database connection)       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Routes & Controllers                         │   │
│  │  ┌────────── authRoutes.js ─────────┐                    │   │
│  │  │ POST /api/auth/login    ────┐    │                    │   │
│  │  │ POST /api/auth/verify   ────┼──┐ │                    │   │
│  │  └────────────────────────────┼──┤─┘ │                    │   │
│  │           │                    │  │   │                    │   │
│  │  ┌────────▼───── authController.js ─┤                    │   │
│  │  │ - mockLogin()                    │ │                    │   │
│  │  │ - verifyToken()                  │ │                    │   │
│  │  └────────────────────────────────┬─┘ │                    │   │
│  │                                   │   │                    │   │
│  │  ┌────────── studentRoutes.js ──┐ │   │                    │   │
│  │  │ GET /api/student/:id/dashboard┼─├──┤                    │   │
│  │  │ GET /api/student/:id/attendance ──┤                    │   │
│  │  │ GET /api/student/:id/fees  ───────┤                    │   │
│  │  └────────────────────────────────┐──┘ │                    │   │
│  │           │                       │    │                    │   │
│  │  ┌─────────▼───── dataController.js ──┤                    │   │
│  │  │ - getStudentDashboard()            │ │                    │   │
│  │  │ - getStudentAttendance()           │ │                    │   │
│  │  │ - getStudentFees()                 │ │                    │   │
│  │  └──────────────────────────────────┬─┘ │                    │   │
│  └──────────────────────────────────────┼──┘                    │   │
│                                          │                       │   │
│  ┌───────────────────────────────────────▼────────────────────┐ │
│  │              Data Models (Query Builders)                   │ │
│  │  ┌────────────────────────────────────────────────────────┐│ │
│  │  │ User.js          Student.js       Fee.js               ││ │
│  │  │ - getUserByPhone - getStudentBy   - getPendingFees  ││ │
│  │  │ - getUserById      UserId         - getTotalPending ││ │
│  │  │ - createUser     - createStudent  - createFee      ││ │
│  │  │ - updateUser     - updateStudent  - markFeeAsPaid ││ │
│  │  │                                                      ││ │
│  │  │ Attendance.js                                      ││ │
│  │  │ - getAttendanceByStudentId                         ││ │
│  │  │ - getAttendancePercentage                          ││ │
│  │  │ - getAttendanceSummary                             ││ │
│  │  │ - createAttendance                                 ││ │
│  │  │ - updateAttendance                                 ││ │
│  │  └────────────────────────────────────────────────────┘│ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────┬──────────────────────────────────────────────┘
                  │
                  │ SQL Queries (Pool)
                  │
┌─────────────────▼──────────────────────────────────────────────┐
│         PostgreSQL Database (Port 5432)                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   Database Schema                        │ │
│  │                                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐                     │ │
│  │  │    users     │  │  students    │                     │ │
│  │  │ ┌──────────┐ │  │ ┌──────────┐ │                     │ │
│  │  │ │id (PK)   │ │  │ │id (PK)   │ │                     │ │
│  │  │ │phone(UK) │ │  │ │userId(FK)│◄──┐                   │ │
│  │  │ │email     │ │  │ │name      │ │  │                   │ │
│  │  │ │role      │ │  │ │classLevel│ │  │                   │ │
│  │  │ │schoolId  │ │  │ │section   │ │  │                   │ │
│  │  │ │isActive  │ │  │ │status    │ │  │ (1:1) creates   │ │
│  │  │ │createdAt │ │  │ │rollNumber│ │  │                   │ │
│  │  │ │updatedAt │ │  │ │createdAt │ │  │                   │ │
│  │  │ └──────────┘ │  │ └──────────┘ │  │                   │ │
│  │  └──────────────┘  └──────────────┘  │                   │ │
│  │        1 (has) │                    │                   │ │
│  │                │          (1:N) has ┘                   │ │
│  │        N │    N                 │                       │ │
│  │          │ │   │                 │                       │ │
│  │  ┌───────▼─────▼──┐   ┌────────▼──────┐                │ │
│  │  │      fees      │   │  attendance    │                │ │
│  │  │ ┌────────────┐ │   │ ┌────────────┐ │                │ │
│  │  │ │id (PK)     │ │   │ │id (PK)     │ │                │ │
│  │  │ │studentId   │◄┼─┐ │ │studentId   │◄┼─┐              │ │
│  │  │(FK)         │ │ │ │ │(FK)         │ │ │              │ │
│  │  │ │userId (FK)│◄┼─┼─┼─│ │userId (FK) │◄┼─┼─┐            │ │
│  │  │ │amount     │ │ │ │ │ │date        │ │ │ │            │ │
│  │  │ │dueDate    │ │ │ │ │ │status      │ │ │ │            │ │
│  │  │ │paidDate   │ │ │ │ │ │remarks     │ │ │ │            │ │
│  │  │ │isPaid     │ │ │ │ │ │schoolId    │ │ │ │            │ │
│  │  │ │month      │ │ │ │ │ │createdAt   │ │ │ │            │ │
│  │  │ │academicY. │ │ │ │ │ │updatedAt   │ │ │ │            │ │
│  │  │ │schoolId   │ │ │ │ │ └────────────┘ │ │ │            │ │
│  │  │ │createdAt  │ │ │ │ └────────────────┘ │ │            │ │
│  │  │ │updatedAt  │ │ │ │ (1:N) tracks      │ │            │ │
│  │  │ └────────────┘ │ │ │                    │ │            │ │
│  │  └────────────────┘ │ │    N records/     │ │            │ │
│  │  (1:N) tracks          │    N per student  │ │            │ │
│  │  N fees/N per student  │                    │ │            │ │
│  │                        └────────────────────┘ │            │ │
│  │                                              │ │            │ │
│  │  All tables indexed on:                      │ │            │ │
│  │  - userId, studentId (FK lookups)            │ │            │ │
│  │  - isPaid (fee filtering)                    │ │            │ │
│  │  - attendanceDate (date filtering)           │ │            │ │
│  │  - schoolId (multi-tenant queries)           │ │            │ │
│  └──────────────────────────────────────────────┘ │            │ │
│                                                  ├─┘            │ │
│  ┌──────────────────────────────────────────────┐             │ │
│  │        Connection Pool (Max: 10)             │             │ │
│  │  - Reuses connections                        │             │ │
│  │  - Timeout: 30s idle, 2s connection         │             │ │
│  │  - Parameterized queries (SQL injection safe)             │ │
│  └──────────────────────────────────────────────┘             │ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Login Flow
```
Browser              Frontend              Backend              Database
   │                   │                      │                    │
   │ 1. Enter phone &  │                      │                    │
   │    click login    │                      │                    │
   ├────────────────────>                     │                    │
   │                   │ 2. POST /auth/login  │                    │
   │                   │    (phone, role)     │                    │
   │                   ├─────────────────────>                     │
   │                   │                      │ 3. getUserByPhone()│
   │                   │                      ├───────────────────>
   │                   │                      │ 4. SELECT * FROM  │
   │                   │                      │    users WHERE... │
   │                   │                      │<───────────────────
   │                   │                      │                    │
   │                   │                      │ 5. createUser()   │
   │                   │                      │    (if new)        │
   │                   │                      ├───────────────────>
   │                   │                      │ INSERT INTO users │
   │                   │                      │<───────────────────
   │                   │                      │                    │
   │                   │                      │ 6. createStudent()│
   │                   │                      ├───────────────────>
   │                   │                      │ INSERT INTO...    │
   │                   │                      │<───────────────────
   │                   │                      │                    │
   │                   │<─────────────────────                     │
   │ 7. Token, userId, │                      │                    │
   │    student data   │                      │                    │
   │<────────────────────                     │                    │
   │                   │                      │                    │
   │ 8. Store token    │                      │                    │
   │    & redirect to  │                      │                    │
   │    dashboard      │                      │                    │
   │                   │                      │                    │
```

### Dashboard Load Flow
```
Browser              Frontend              Backend              Database
   │                   │                      │                    │
   │ 1. Page loads    │                      │                    │
   │ (with userId)    │                      │                    │
   │                   │ 2. GET /student/    │                    │
   │                   │    :userId/          │                    │
   │                   │    dashboard         │                    │
   │                   ├─────────────────────>                     │
   │                   │                      │                    │
   │                   │                      │ 3. getStudentBy   │
   │                   │                      │    UserId()        │
   │                   │                      ├───────────────────>
   │                   │                      │ SELECT * FROM...  │
   │                   │                      │<───────────────────
   │                   │                      │                    │
   │                   │                      │ 4. Multiple calls:│
   │                   │                      │    - getAttendance│
   │                   │                      │    - getFees      │
   │                   │                      ├───────────────────>
   │                   │                      │ SELECT * FROM...  │
   │                   │                      │<───────────────────
   │                   │                      │                    │
   │                   │ 5. Aggregated JSON  │                    │
   │                   │<─────────────────────                     │
   │ 6. Render         │                      │                    │
   │    dashboard with│                      │                    │
   │    data          │                      │                    │
   │<────────────────────                     │                    │
```

---

## Component Interaction Map

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND                           │
│  ┌──────────────────────────────────────────────┐  │
│  │ Page Load                                    │  │
│  │ ├─ index.html (login page)                 │  │
│  │ └─ student.html (dashboard page)           │  │
│  └──────────────────────────────────────────────┘  │
│         │                      │                    │
│  ┌──────▼────────┐  ┌──────────▼────────┐          │
│  │  auth.js      │  │  dashboard.js     │          │
│  │ ┌────────────┐│  │ ┌────────────────┐│          │
│  │ │Login form  ││  │ │Fetch dashboard ││          │
│  │ │submission  ││  │ │Render UI       ││          │
│  │ └────────────┘│  │ └────────────────┘│          │
│  └──────┬────────┘  └────────┬─────────┘           │
│         │                     │                     │
│         └─────────┬───────────┘                     │
│                   │                                 │
│         ┌─────────▼──────────┐                      │
│         │  api.js            │                      │
│         │ ┌────────────────────┐                    │
│         │ │ HTTP Wrapper       │                    │
│         │ │ - POST /auth/login │                    │
│         │ │ - GET dashboard    │                    │
│         │ │ - GET attendance   │                    │
│         │ │ - GET fees         │                    │
│         │ │ - Token management │                    │
│         │ └────────────────────┘                    │
│         └─────────┬──────────┘                      │
└──────────────────┼────────────────────────────────┘
                   │
        HTTP (REST API Calls)
                   │
┌──────────────────▼────────────────────────────────┐
│           EXPRESS SERVER                         │
│  ┌────────────────────────────────┐             │
│  │ Routing Layer                  │             │
│  │ ├─ /api/auth/login   ──────┐  │             │
│  │ ├─ /api/auth/verify   ─┐   │  │             │
│  │ ├─ /api/student/:id/  ─┼─┐ │  │             │
│  │ │   dashboard           │ │ │  │             │
│  │ ├─ /api/student/:id/  ─┼─┼─┤  │             │
│  │ │   attendance          │ │ │  │             │
│  │ └─ /api/student/:id/  ─┘ │ │  │             │
│  │    fees                  │ │  │             │
│  └────────────────────────────┘  │             │
│         │                   │                    │
│  ┌──────▼──────┐  ┌────────▼──────┐            │
│  │authController│  │dataController │            │
│  │┌────────────┐│  │┌────────────────┐          │
│  ││Login logic ││  ││Dashboard logic ││          │
│  ││Token gen   ││  ││Attendance calc ││          │
│  ││Validation  ││  ││Fee aggregation ││          │
│  │└────────────┘│  │└────────────────┘          │
│  └──────┬───────┘  └────────┬─────────┘         │
│         │                    │                   │
│         └─────────┬──────────┘                   │
│                   │                              │
│  ┌────────────────▼─────────────────────┐       │
│  │ Data Models (Query Builders)         │       │
│  │ ├─ User.js                           │       │
│  │ ├─ Student.js                        │       │
│  │ ├─ Fee.js                            │       │
│  │ └─ Attendance.js                     │       │
│  └────────────────┬─────────────────────┘       │
└───────────────────┼──────────────────────────────┘
                    │
         SQL Queries (pg library)
                    │
┌───────────────────▼──────────────────────────────┐
│  PostgreSQL Database                             │
│  ├─ users table                                  │
│  ├─ students table                               │
│  ├─ fees table                                   │
│  └─ attendance table                             │
└────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
Frontend Layer
   ├─ HTML5 (Structure)
   ├─ CSS3 (Styling)
   └─ Vanilla JavaScript (Logic - ES6 modules)

Application Layer
   ├─ Express.js (Web framework)
   ├─ Node.js / Bun (Runtime)
   └─ dotenv (Configuration)

Data Access Layer
   ├─ pg (PostgreSQL client)
   └─ SQL (Parameterized queries)

Database Layer
   └─ PostgreSQL (Relational database)

Utilities
   ├─ cors (Cross-origin requests)
   ├─ bcryptjs (Password hashing)
   └─ body-parser (JSON parsing)
```

---

## Request/Response Cycle

```
1. Browser Request
   Method: POST
   URL: http://localhost:3000/api/auth/login
   Headers: { Content-Type: application/json }
   Body: { "phone": "9999999991", "role": "student" }

2. Express Processing
   - Middleware: Parse JSON
   - Middleware: CORS validation
   - Middleware: Inject database pool
   - Router: Match to /api/auth/*
   - Controller: mockLogin()
     ├─ Validate input
     ├─ Query User table
     ├─ Create User if new
     ├─ Create Student record
     └─ Generate token

3. Database Queries
   - SELECT * FROM users WHERE phone = $1
   - INSERT INTO users (...) VALUES (...)
   - INSERT INTO students (...) VALUES (...)

4. Server Response
   Status: 200
   Headers: { Content-Type: application/json }
   Body: {
     "success": true,
     "token": "base64_encoded",
     "userId": 1,
     "student": { ... }
   }

5. Browser Receives
   ├─ Parse JSON
   ├─ Store token in sessionStorage
   ├─ Redirect to dashboard
   └─ Load dashboard data
```

---

## Database Relationship Model

```
┌─────────────┐
│    users    │  (Primary entity for all users)
├─────────────┤
│ id (PK)     │
│ phone (UK)  │◄─────────────────────┐
│ email       │                       │
│ role        │                       │
│ schoolId    │                       │
│ isActive    │                       │
│ createdAt   │                       │
│ updatedAt   │                       │
└──────┬──────┘                       │
       │ (1)                          │
       │ has parent                   │
       │ (N)                          │ Referenced by
       │                              │
       N                              │
       │                              │
       │ (1)                          │
       ▼                              │
┌──────────────────┐                 │
│   students       │                 │
├──────────────────┤                 │
│ id (PK)          │                 │
│ userId (FK) ──────────────────────┘
│ name             │
│ classLevel       │
│ section          │
│ rollNumber       │
│ status           │
│ createdAt        │
│ updatedAt        │
└────────┬─────────┘
         │ (1)
         │ has
         N (1:N)
         │
    ┌────┴────────────────────┐
    │                         │
    ▼ (N)                     ▼ (N)
┌─────────┐              ┌────────────┐
│  fees   │              │ attendance │
├─────────┤              ├────────────┤
│ id (PK) │              │ id (PK)    │
│studentId│              │studentId   │
│(FK)     │              │(FK)        │
│userId   │              │userId      │
│(FK)     │              │(FK)        │
│amount   │              │date        │
│dueDate  │              │status      │
│paidDate │              │remarks     │
│isPaid   │              │createdAt   │
│month    │              │updatedAt   │
│academic │              └────────────┘
│Year     │
│createdAt│
│updatedAt│
└─────────┘

Legend:
  PK = Primary Key (Unique identifier)
  FK = Foreign Key (Reference to another table)
  UK = Unique Key (Must be unique)
  (1) = One record
  (N) = Many records
  (1:N) = One-to-Many relationship
```

---

This complete architecture ensures:
- ✅ Separation of concerns
- ✅ Scalability
- ✅ Maintainability
- ✅ Security
- ✅ Performance

# Tuition App - API Documentation (v1.0)

This document provides a comprehensive overview of the available API endpoints in the Tuition App. All endpoints are scoped by `school_id` to ensure strict tenant isolation.

---

## 🔐 Authentication API (`/api/auth`)

| Endpoint | Method | Description | Access |
| :--- | :--- | :--- | :--- |
| `/login` | `POST` | Authenticate user and receive tokens | Public |
| `/logout` | `POST` | Clear session and tokens | Public |
| `/refresh` | `POST` | Get new access token using refresh token | Public |
| `/register` | `POST` | Register a new school/organization | Public |
| `/me` | `GET` | Get current user's identity and school | Authenticated |

---

## 👔 Administrative API (`/api/admin`)
*Requires `admin` role and valid `school_id`.*

### Users Module
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/users` | `GET` | List all teachers and staff in the school |
| `/users/create` | `POST` | Create a new teacher or staff account |
| `/users/:id` | `PUT` | Update user details (name, phone, role, classes) |
| `/users/:id` | `DELETE` | Delete a user account |
| `/users/:id/status` | `PATCH` | Toggle user active/blocked status |
| `/users/:id/assignments` | `GET` | Get class assignments for a specific teacher |

### Students Module
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/students` | `GET` | List all students in the school |
| `/students/create` | `POST` | Enroll a new student (Atomic with User creation) |
| `/students/:id` | `PUT` | Update student profile and class details |
| `/students/:id` | `DELETE` | Delete a student record (and User if no other students) |
| `/students/:id/status` | `PATCH` | Change student enrollment status |

### Financials & Reporting
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/financials/unpaid-fees` | `GET` | List all pending fee records |
| `/financials/report` | `GET` | Get overall financial KPI summary |
| `/financials/trends` | `GET` | Get 30-day collection trends |
| `/stats/summary` | `GET` | Unified dashboard stats (Students, Users, Fees, etc.) |

### Academic & Operations
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/timetable` | `GET` | Fetch complete school timetable |
| `/timetable` | `POST` | Add entry to timetable (with overlap protection) |
| `/timetable/:id` | `DELETE` | Remove entry from timetable |
| `/attendance/overall-monthly` | `GET` | Get monthly school-wide attendance rate |
| `/classes` | `GET` | List distinct class levels |
| `/sections` | `GET` | List sections for a specific class |
| `/teachers-by-class` | `GET` | Get teachers assigned to a class/section |
| `/teachers` | `GET` | List all active teachers |
| `/subjects` | `GET` | List all subjects in the school |

### System & Content
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/profile` | `GET` | Get admin's own profile |
| `/profile` | `PUT` | Update admin profile details |
| `/organization` | `GET` | Get school organization settings |
| `/audit-logs` | `GET` | View system-wide administrative audit trail |
| `/content` | `GET` | List all editable content pages |
| `/content/:key` | `GET` | Fetch specific content page (e.g., 'privacy') |
| `/content/:key` | `PUT` | Update content page markdown |
| `/content/:key` | `DELETE` | Reset content page to empty |

---

## 🍎 Teacher API (`/api/teacher`)
*Requires `teacher`, `staff`, or `admin` role.*

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/dashboard` | `GET` | Get teacher-specific dashboard summary |
| `/classes` | `GET` | List classes assigned to the teacher |
| `/students` | `GET` | List students in teacher's assigned classes |
| `/subjects` | `GET` | List subjects assigned to the teacher |

---

## 🎓 Student API (`/api/student`)
*Requires valid session. Students only access their own data via `userId`.*

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/:userId/dashboard` | `GET` | Get personalized dashboard (Attendance, Fees, Assignments) |
| `/:userId/attendance` | `GET` | View personal attendance records |
| `/:userId/fees` | `GET` | View personal fee status and history |
| `/:userId/results` | `GET` | View personal exam results |
| `/:userId/homework` | `GET` | View homework assigned to student's class |
| `/:userId/syllabus` | `GET` | View syllabus progress for student's class |

---

## 📦 Shared Module APIs

### 📝 Submissions (`/api/submissions`)
| Endpoint | Method | Description | Access |
| :--- | :--- | :--- | :--- |
| `/` | `POST` | Upload homework submission | Student |
| `/student/:userId` | `GET` | List own submissions | Student |
| `/homework/:id` | `GET` | List submissions for a task | Teacher/Admin |
| `/teacher` | `GET` | List all submissions in classes | Teacher/Admin |
| `/:id/review` | `PUT` | Add remarks and status to submission | Teacher/Admin |

### 📚 Materials (`/api/materials`)
| Endpoint | Method | Description | Access |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | List study materials | Authenticated |
| `/upload` | `POST` | Upload new material | Teacher/Admin |
| `/:id` | `PUT` | Edit material metadata | Teacher/Admin |
| `/:id` | `DELETE` | Remove material | Admin |

### 🔔 Notifications (`/api/admin/notifications`)
| Endpoint | Method | Description | Access |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Fetch active notices | Authenticated |
| `/` | `POST` | Create school-wide notice | Admin |
| `/:id` | `DELETE` | Archive notice | Admin |

### 💾 Cloud Storage (`/api/storage`)
| Endpoint | Method | Description | Access |
| :--- | :--- | :--- | :--- |
| `/upload` | `POST` | Secure file upload to Drive/S3 | Teacher/Admin |
| `/files` | `GET` | List authorized files | Authenticated |
| `/download/:id` | `GET` | Proxied file stream download | Authenticated |

---

## 🌐 Public APIs (`/api/public`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/content/:key` | `GET` | Fetch public landing page content (Privacy, Terms, Help, etc.) |

**Valid Keys:** `programs`, `resources`, `contact`, `privacy`, `learn-more`, `terms`, `help`, `documentation`

---

## 🛠️ System Health
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | Verify server and database connectivity |

---

## 🛡️ Security Standards
1. **Tenant Isolation**: Every database query includes `WHERE school_id = $X`.
2. **Atomic Ops**: Transactions used for critical operations (Enrollment, Timetable).
3. **Concurrency**: Advisory locks (`pg_advisory_xact_lock`) prevent race conditions.
4. **Validation**: All inputs sanitized via middleware.
5. **Audit Logs**: All state-changing admin actions logged to `audit_logs`.

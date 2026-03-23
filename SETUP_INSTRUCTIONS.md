# Fixed Frontend & Backend Setup Instructions

## ✅ What Has Been Fixed

1. **Frontend Master Dashboard** - Now shows as homepage when you visit the app
2. **Database Seeding** - Sample students, fees, and attendance data created automatically
3. **Static File Server** - Bun server properly configured to serve frontend files
4. **Login Routing** - All login pages (Student, Teacher, Parent, Admin) properly linked

---

## 📋 Prerequisites

Ensure you have:
- ✅ **PostgreSQL** running locally
- ✅ **Node.js & Bun** installed
- ✅ **Database** created: `CREATE DATABASE tuition_app;`
- ✅ **Backend .env** file configured (see Step 1)

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Verify Backend Configuration

Navigate to `backend/.env` and ensure these values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456        # Change if different
DB_NAME=tuition_app
PORT=3000
INITIALIZE_DB=true
SEED_DB=true
```

### Step 2: Install Backend Dependencies

```bash
cd backend
bun install
```

### Step 3: Start Backend Server (Terminal 1)

```bash
cd backend
bun run dev
```

**Expected Output:**
```
✅ PostgreSQL Database connected successfully
📋 Initializing database tables...
  → Creating users table...
  → Creating students table...
  → Creating fees table...
  → Creating attendance table...
✅ All tables created successfully!
✅ Default admin user created...
✅ Default teacher user created...
✅ Default parent user created...
🌱 Seeding database with sample data...
✅ Created 5 sample students
✅ Created 30 fee records
✅ Created 150 attendance records
✅ Database seeding completed successfully!

🚀 Server running at http://localhost:3000
```

### Step 4: Start Frontend Server (Terminal 2)

**Option A: Using Bun (Recommended)**
```bash
cd frontend
bun run server.ts
```

**Option B: Using Python**
```bash
cd frontend
python -m http.server 8000
```

**Option C: Direct Backend Access**
- No need for separate frontend server - just visit `http://localhost:3000`

### Step 5: Access the Application

**Master Dashboard (Home):**
- **Bun Server:** http://localhost:8000
- **Python Server:** http://localhost:8000
- **Backend Only:** http://localhost:3000

---

## 🧪 Test the Application

### 1. Login as Student
1. Click "Student Login" on the master dashboard
2. Enter phone: `9999999991` (or any number from 9999999991-9999999995)
3. You'll be redirected to the student dashboard
4. All data (attendance, fees) will load from the database

### 2. Login as Teacher
- URL: http://localhost:8000/teacher-login.html
- Phone: `8888888888`
- Password: `teacher123`

### 3. Login as Parent
- URL: http://localhost:8000/parent-login.html
- Phone: `7777777777`
- Password: `parent123`

### 4. Login as Admin
- URL: http://localhost:8000/admin-login.html
- Phone: `9999999999`
- Password: `admin123`

---

## 🔍 Verify Everything Works

### Check Backend Health
```bash
curl http://localhost:3000/health
```

### Check Student Login Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999999991","role":"student"}'
```

### Check Student Dashboard Data
Replace `1` with actual student ID:
```bash
curl http://localhost:3000/api/student/1/dashboard
```

---

## 📁 Project Structure

```
tuition-app/
├── backend/
│   ├── .env                    # ✅ Already configured
│   ├── server.js               # Express server
│   ├── database.js             # Database init & seeding ✅ FIXED
│   ├── models/                 # Database models
│   ├── controllers/            # Business logic
│   └── routes/                 # API endpoints
│
├── frontend/
│   ├── index.html              # ✅ Master Dashboard (FIXED)
│   ├── student-login.html      # ✅ NEW - Student Login Page
│   ├── teacher-login.html      # Teacher Login
│   ├── parent-login.html       # Parent Login
│   ├── admin-login.html        # Admin Login
│   ├── pages/
│   │   └── student.html        # Student Dashboard
│   ├── js/
│   │   ├── api.js              # API wrapper
│   │   ├── master-dashboard.js # ✅ Home page navigation
│   │   ├── login.js            # ✅ NEW - Student login logic
│   │   ├── dashboard.js        # Fetch & display data
│   │   └── auth.js             # Auth helpers
│   ├── css/
│   │   ├── master-dashboard.css
│   │   ├── parent-dashboard.css
│   │   └── style.css
│   └── server.ts               # ✅ NEW - Bun static server
```

---

## 🐛 Troubleshooting

### Issue: 404 Error When Accessing Frontend
**Solution:** Make sure you're accessing the correct URL:
- If using Bun server: `http://localhost:8000`
- If using Python server: `http://localhost:8000`
- If accessing via backend: `http://localhost:3000`

### Issue: No Data Showing in Dashboard
**Solution:** 
1. Check that backend is running and database is connected
2. Verify `SEED_DB=true` in `.env`
3. Check console for errors: `curl http://localhost:3000/api/student/1/dashboard`

### Issue: "Cannot GET /student-login.html"
**Solution:** Make sure you're using relative URLs without `/` prefix. The frontends should use:
- `student-login.html` (not `/student-login.html`)
- `pages/student.html` (not `/pages/student.html`)

### Issue: PostgreSQL Connection Error
**Solution:**
1. Verify PostgreSQL is running
2. Check `.env` database credentials match your PostgreSQL setup
3. Ensure `tuition_app` database exists: `psql -U postgres -l | grep tuition_app`

---

## 📝 API Endpoints Available

All endpoints require the backend to be running on `http://localhost:3000/api`

### Authentication
- `POST /auth/login` - Student login
- `POST /auth/admin-login` - Admin login
- `POST /auth/teacher-login` - Teacher login
- `POST /auth/parent-login` - Parent login

### Student Data
- `GET /student/:userId/dashboard` - Full dashboard data
- `GET /student/:userId/attendance` - Attendance records
- `GET /student/:userId/fees` - Fee records

### Admin
- `GET /admin/students` - All students
- `GET /admin/users` - All users

---

## 🎉 Success Indicators

✅ Backend starts without errors  
✅ Database tables created successfully  
✅ Sample data seeded (5 students, 30 fees, 150 attendance records)  
✅ Browser shows master dashboard at http://localhost:8000  
✅ Login pages work correctly  
✅ Student data loads in dashboard  

---

## 📚 Additional Resources

- [API Documentation](./API_REFERENCE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Project Specification](./MVP_SPECIFICATION.md)

---

## ✨ Summary of Changes Made

✅ **index.html** - Replaced with master dashboard (home page)  
✅ **student-login.html** - Created new student login page  
✅ **login.js** - New script for student login form handling  
✅ **master-dashboard.js** - Updated navigation links  
✅ **database.js** - Added seedDatabase() function with sample data  
✅ **.env** - Added SEED_DB=true to enable auto-seeding  
✅ **server.ts** - Created Bun static file server for frontend  
✅ **API endpoints** - Ready to fetch student data from database  

Let me know if you encounter any issues!

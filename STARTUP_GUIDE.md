# 🚀 Tuition App - Complete Setup & Development Guide

## ✅ What's Included

This is a **Full-Stack Tuition Management System** with:
- **Backend**: Express.js server with PostgreSQL database
- **Frontend**: Vanilla JavaScript with responsive HTML/CSS
- **Database**: Complete schema with users, students, fees, and attendance
- **API**: RESTful endpoints for authentication and data management

---

## 📋 Prerequisites

Before starting, ensure you have installed:

1. **Node.js & Bun** - [Download here](https://bun.sh/)
   ```bash
   node --version    # Should be v18 or higher
   bun --version     # Should be latest
   ```

2. **PostgreSQL Database** - [Download here](https://www.postgresql.org/download/)
   ```bash
   psql --version    # Verify PostgreSQL is installed
   ```

3. **Python** (Optional, for running frontend server)
   ```bash
   python --version  # Should be Python 3.7+
   ```

---

## 🗄️ Step 1: Create PostgreSQL Database

Open PostgreSQL command line (psql) and create the database:

```sql
-- Create database
CREATE DATABASE tuition_app;

-- Create user (if needed)
CREATE USER postgres WITH PASSWORD 'postgres';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE tuition_app TO postgres;

-- Connect to the new database
\c tuition_app
```

**Verify the database was created:**
```bash
psql -h localhost -U postgres -d tuition_app -c "SELECT 'Database is ready!' as status;"
```

---

## ⚙️ Step 2: Configure Backend Environment

1. Navigate to the backend directory:
   ```bash
   cd tuition-app/backend
   ```

2. Copy the example environment file:
   ```bash
   # On Windows PowerShell
   Copy-Item .env.example .env
   
   # On macOS/Linux
   cp .env.example .env
   ```

3. Edit the `.env` file with your PostgreSQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres    # Change if you set a different password
   DB_NAME=tuition_app
   DB_CONNECTION_LIMIT=10
   
   PORT=3000
   NODE_ENV=development
   
   INITIALIZE_DB=true      # Creates tables on startup
   SEED_DB=true           # Adds sample data on startup
   ```

---

## 📦 Step 3: Install Backend Dependencies

```bash
cd tuition-app/backend
bun install
```

This installs:
- `express` - Web framework
- `pg` - PostgreSQL client
- `cors` - Cross-origin requests
- `dotenv` - Environment variables
- `bcryptjs` - Password hashing

---

## 🚀 Step 4: Start the Backend Server

In the `backend/` directory, run:

```bash
# Development mode (with auto-reload)
bun run dev

# Or production mode
bun run start
```

**Expected output:**
```
✅ PostgreSQL Database connected successfully
🗄️  Initializing database tables...
  → Creating users table...
  → Creating students table...
  → Creating fees table...
  → Creating attendance table...
✅ Database initialization complete!
🌱 Seeding database with sample data...
✅ Database seeding complete!
   Created 5 users
   Created 5 students
   Created 15 fee records
   Created 100 attendance records

🚀 Server running at http://localhost:3000
📊 Dashboard: http://localhost:8000
🏥 Health check: http://localhost:3000/health
```

---

## 🖥️ Step 5: Start the Frontend Server

Open a **new terminal/PowerShell tab** and navigate to the frontend:

```bash
cd tuition-app/frontend
```

### Option A: Using Python (Recommended)
```bash
python -m http.server 8000
```

### Option B: Using Node.js
```bash
npx http-server -p 8000
```

### Option C: VS Code Live Server
- Install the "Live Server" extension in VS Code
- Right-click on `index.html` → "Open with Live Server"

**Access the app:**
- **Login Page**: http://localhost:8000
- **Health Check**: http://localhost:3000/health

---

## 🧪 Step 6: Test the Application

### Test Login
1. Open http://localhost:8000 in your browser
2. Enter any 10-digit phone number (e.g., `9999999999`)
3. Click "Login"
4. You should be registered and redirected to the dashboard

### Test Endpoints (Using cURL or Postman)

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999999991","role":"student"}'
```

**Get Dashboard Data:**
```bash
curl http://localhost:3000/api/student/1/dashboard
```

**Get Attendance:**
```bash
curl http://localhost:3000/api/student/1/attendance
```

**Get Fees:**
```bash
curl http://localhost:3000/api/student/1/fees
```

---

## 📊 Database Schema

### Users Table
- `id` (PK) - Unique identifier
- `phone` - Phone number (unique)
- `email` - Email address
- `role` - student | teacher | admin
- `schoolId` - School identifier

### Students Table
- `id` (PK)
- `userId` (FK) - Reference to users
- `name` - Student name
- `classLevel` - Class (10A, 10B, etc)
- `section` - Section (A, B, C)
- `fatherName` - Father's name
- `motherName` - Mother's name
- `rollNumber` - Roll number
- `status` - active | inactive | graduated

### Fees Table
- `id` (PK)
- `studentId` (FK) - Reference to students
- `amount` - Fee amount
- `dueDate` - Due date
- `paidDate` - Date paid
- `isPaid` - Payment status
- `month` - Month of fee
- `academicYear` - Academic year

### Attendance Table
- `id` (PK)
- `studentId` (FK)
- `attendanceDate` - Date of attendance
- `status` - present | absent | late | leave
- `remarks` - Additional notes

---

## 📁 Project Structure

```
tuition-app/
├── backend/
│   ├── server.js              # Main server file
│   ├── database.js            # DB initialization & seeding
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment config (not in git)
│   ├── .env.example           # Template for .env
│   ├── models/
│   │   ├── User.js            # User model & helpers
│   │   ├── Student.js         # Student model & helpers
│   │   ├── Fee.js             # Fee model & helpers
│   │   └── Attendance.js      # Attendance model & helpers
│   ├── controllers/
│   │   ├── authController.js  # Login & auth logic
│   │   └── dataController.js  # Dashboard & data fetch
│   └── routes/
│       ├── authRoutes.js      # /api/auth/* endpoints
│       └── studentRoutes.js   # /api/student/* endpoints
│
├── frontend/
│   ├── index.html             # Login page
│   ├── js/
│   │   ├── api.js             # API wrapper
│   │   ├── auth.js            # Login handler
│   │   └── dashboard.js       # Dashboard logic
│   ├── css/
│   │   └── style.css          # Styling
│   └── pages/
│       └── student.html       # Dashboard page
│
├── README.md                  # Project overview
└── SETUP.md                   # Setup guide
```

---

## 🔧 Common Issues & Solutions

### ❌ "PostgreSQL connection error"
**Solution:**
- Ensure PostgreSQL is running: `pg_isready -h localhost`
- Check credentials in `.env` file
- Create the database if it doesn't exist
- Verify port 5432 is open

### ❌ "Port 3000 already in use"
**Solution:**
```bash
# Find process using port 3000
lsof -i :3000          # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>          # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### ❌ "Module not found" errors
**Solution:**
```bash
cd backend
rm -rf node_modules bun.lock
bun install
```

### ❌ CORS errors
**Solution:**
- Ensure backend CORS is enabled for frontend URL
- Check `.env` CORS_ORIGIN setting
- Verify frontend is on port 8000 and backend on 3000

---

## 🎨 Customization Guide

### Change Database Credentials
1. Edit `backend/.env`
2. Restart the server
3. The database will be reinitialized

### Disable Automatic Seeding
In `backend/.env`, set:
```env
SEED_DB=false
```

### Add More Sample Data
Edit `backend/database.js` and modify the `seedDatabase` function

### Change Server Port
In `backend/.env`, set:
```env
PORT=4000
```

Then access at `http://localhost:4000`

---

## 📚 API Documentation

### Authentication Endpoints

**POST /api/auth/login**
```json
Request:
{
  "phone": "9999999991",
  "role": "student"
}

Response:
{
  "success": true,
  "token": "base64encoded_token",
  "userId": 1,
  "role": "student",
  "student": { /* student data */ }
}
```

**POST /api/auth/verify**
```
Headers: Authorization: Bearer <token>

Response:
{
  "valid": true,
  "userId": 1,
  "role": "student"
}
```

### Student Endpoints

**GET /api/student/:userId/dashboard**
```
Response:
{
  "success": true,
  "data": {
    "profile": { /* student info */ },
    "attendance": { /* attendance stats */ },
    "fees": { /* fee status */ },
    "homework": [ /* homework items */ ],
    "courseProgress": { /* progress */ }
  }
}
```

**GET /api/student/:userId/attendance**
```
Response:
{
  "success": true,
  "records": [ /* attendance records */ ],
  "summary": { /* attendance summary */ }
}
```

**GET /api/student/:userId/fees**
```
Response:
{
  "success": true,
  "summary": { /* fee summary */ },
  "fees": [ /* fee records */ ]
}
```

---

## 🚀 Production Deployment

Before deploying to production:

1. **Update Environment Variables**
   ```env
   NODE_ENV=production
   INITIALIZE_DB=false
   SEED_DB=false
   DB_PASSWORD=<strong_password>
   ```

2. **Enable HTTPS**
   - Use environment variable for CORS_ORIGIN
   - Install SSL certificates

3. **Database Backup**
   ```bash
   pg_dump -h localhost -U postgres tuition_app > backup.sql
   ```

4. **Monitor Logs**
   - Set up error logging
   - Monitor database queries
   - Track API response times

---

## 📞 Support & Questions

For issues or questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Inspect browser console for errors
4. Check server logs for database errors

---

## 📝 Development Tips

- **Hot Reload**: Use `bun run dev` for auto-reload on file changes
- **Database Reset**: Delete tables and restart the server with `INITIALIZE_DB=true`
- **Test Data**: Sample data is created automatically with `SEED_DB=true`
- **API Testing**: Use Postman or curl to test endpoints
- **Frontend Debug**: Use browser DevTools (F12) to inspect API calls
- **Console Logs**: Check browser console and server logs for debugging

---

## ✅ Checklist for Getting Started

- [ ] PostgreSQL installed and running
- [ ] Database `tuition_app` created
- [ ] `.env` file configured with correct credentials
- [ ] Backend dependencies installed (`bun install`)
- [ ] Backend server started (`bun run dev`)
- [ ] Frontend server started (Python or other method)
- [ ] Accessed http://localhost:8000
- [ ] Logged in with a test phone number
- [ ] Viewed dashboard with student data
- [ ] Checked attendance and fees sections

**You're all set! 🎉**


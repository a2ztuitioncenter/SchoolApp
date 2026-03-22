# 🚀 Quick Start Commands

## 📋 One-Time Setup

```bash
# 1. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE tuition_app;"

# 2. Navigate to backend
cd tuition-app/backend

# 3. Copy environment configuration
copy .env.example .env      # Windows
# OR
cp .env.example .env        # macOS/Linux

# 4. Install dependencies
bun install
```

---

## ▶️ Start Development Servers

### Terminal 1: Backend Server
```bash
cd tuition-app/backend
bun run dev
```
✅ Server runs at: **http://localhost:3000**

### Terminal 2: Frontend Server
```bash
cd tuition-app/frontend
python -m http.server 8000
```
✅ App runs at: **http://localhost:8000**

---

## 🧪 Quick Test Commands

### Login (from any shell)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999999991","role":"student"}'
```

### Check Server Health
```bash
curl http://localhost:3000/health
```

### Get Dashboard Data (replace 1 with actual userId)
```bash
curl http://localhost:3000/api/student/1/dashboard
```

---

## 📁 File Locations

```
Key Files:
├── backend/.env                    # Environment variables (CREATE THIS)
├── backend/server.js              # Main server entry point
├── backend/database.js            # Database initialization & seeding
├── backend/models/                # Data models
├── backend/controllers/           # Business logic
├── backend/routes/                # API endpoints
└── frontend/                      # Frontend files
```

---

## 🔧 Environment Variables

Create `backend/.env` with:

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tuition_app

# Server
PORT=3000
NODE_ENV=development

# Features
INITIALIZE_DB=true
SEED_DB=true
```

---

## 🗄️ Database Tables Created

- **users** - System users (students, teachers, admins)
- **students** - Student information
- **fees** - Student fee records
- **attendance** - Attendance tracking

Sample data: 5 students, 15 fee records, 100 attendance records

---

## 📱 Test Login

1. Open: http://localhost:8000
2. Enter any 10-digit number (e.g., `9999999991`)
3. Click "Login"
4. View dashboard with auto-populated data

---

## 🛑 Troubleshooting

### PostgreSQL not connecting?
```bash
# Check if PostgreSQL is running
pg_isready -h localhost

# Create database if missing
psql -U postgres -c "CREATE DATABASE tuition_app;"
```

### Port 3000 already in use?
```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux: Find and kill process
lsof -i :3000
kill -9 <PID>
```

### "Cannot find module" errors?
```bash
cd backend
rm -rf node_modules bun.lock
bun install
```

---

## 📚 Documentation Files

- **STARTUP_GUIDE.md** - Complete setup instructions (read this first!)
- **API_REFERENCE.md** - API endpoints and examples
- **SETUP.md** - Original setup notes
- **README.md** - Project overview

---

## 💡 Pro Tips

- Use `bun run dev` for hot-reload on file changes
- Database auto-initializes on first startup
- Sample data automatically seeds on startup
- All API responses are JSON
- Token is base64 encoded in development
- Browser console (F12) shows API call logs

---

## ✅ Checklist

- [ ] PostgreSQL installed and running
- [ ] Backend .env file created and configured
- [ ] Backend dependencies installed (`bun install`)
- [ ] Backend server started (`bun run dev`)
- [ ] Frontend server started (`python -m http.server 8000`)
- [ ] Login page accessible at http://localhost:8000
- [ ] Can login with test phone number
- [ ] Dashboard loads with student data

**Ready to go! 🎉**

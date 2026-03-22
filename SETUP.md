# 🚀 Tuition App Setup Guide

## ✅ What Has Been Built

### Backend (Step A ✅)
- **server.js** — Express server with Firebase Admin SDK initialization
- **package.json** — Dependencies for Express, CORS, Firebase, dotenv
- **Routes & Controllers** — API endpoints for auth and student data

### API Endpoints (Step B ✅)
- **POST `/api/auth/login`** — Mock student login
- **POST `/api/auth/verify`** — Token verification
- **GET `/api/student/:userId/dashboard`** — Complete dashboard data
- **GET `/api/student/:userId/attendance`** — Attendance records
- **GET `/api/student/:userId/fees`** — Fee details

### Frontend (Step C ✅)
- **index.html** — Login page with form
- **pages/student.html** — Dashboard with dynamic content areas
- **js/api.js** — Centralized fetch() wrapper
- **js/auth.js** — Login form handling
- **js/dashboard.js** — DOM population with API data
- **css/style.css** — Complete dashboard styling

---

## 🛠️ Installation & Running

### Step 1: Install Backend Dependencies
```bash
cd tuition-app/backend
bun install
```

### Step 2: Configure Firebase
1. Create `.env` file in `backend/` directory (copy from `.env.example`)
2. Get credentials from Firebase Console:
   - Project Settings → Service Accounts → Generate Private Key
   - Copy JSON values into .env

### Step 3: Start Backend Server
```bash
# Terminal 1 - Backend
cd tuition-app/backend
bun run dev
# Server runs at http://localhost:3000
```

### Step 4: Open Frontend
```bash
# Terminal 2 - Frontend (or use VS Code Live Server)
cd tuition-app/frontend
python -m http.server 8000
# Visit: http://localhost:8000
```

### Step 5: Test the Flow
1. Open `http://localhost:8000` (login page)
2. Enter any 10-digit phone number
3. You'll be redirected to the dashboard at `http://localhost:8000/pages/student.html`
4. Dashboard will auto-populate with mock data from the backend

---

## 📱 Key Features Implemented

✅ **Student Authentication**
- Mock login (no OTP required for development)
- Token-based session management
- Auto-redirect to dashboard

✅ **Dynamic Dashboard**
- Student name & class display
- Attendance percentage
- Pending fees display
- Course progress indicator
- Homework list (with due dates)

✅ **Backend Architecture**
- Modular controllers for business logic
- Reusable data models
- Firestore integration ready
- Error handling & logging

✅ **Frontend Architecture**
- Vanilla JavaScript (no framework bloat)
- Centralized API wrapper for easy backend integration
- DOM manipulation pattern for data binding
- Responsive design

---

## 🔧 API Call Examples

### Login
```javascript
// In frontend
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '9999999999', role: 'student' })
});
const data = await response.json();
// Returns: { token, userId, role, student {...} }
```

### Fetch Dashboard Data
```javascript
// In frontend
const response = await fetch('http://localhost:3000/api/student/USER_ID/dashboard', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer TOKEN' }
});
const data = await response.json();
// Returns: { profile, attendance, fees, homework, courseProgress }
```

---

## 📂 File Structure Explanation

```
backend/
├── server.js              → Main Express app
├── routes/
│   ├── authRoutes.js      → Login/verify endpoints
│   └── studentRoutes.js   → Student dashboard data endpoints
├── controllers/
│   ├── authController.js  → Auth logic
│   └── dataController.js  → Data fetching logic
└── models/
    ├── User.js            → User schema & helpers
    ├── Student.js         → Student schema & helpers
    └── Fee.js             → Fee schema & helpers

frontend/
├── index.html             → Login page
├── js/
│   ├── api.js            → Fetch wrapper
│   ├── auth.js           → Login form handler
│   └── dashboard.js      → DOM updates
├── css/
│   └── style.css         → All styling
└── pages/
    └── student.html      → Dashboard page
```

---

## 🧪 Testing the Backend Manually

```bash
# Check server health
curl http://localhost:3000/health

# Login (create session)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","role":"student"}'

# Get dashboard (replace USER_ID with ID from login response)
curl http://localhost:3000/api/student/USER_ID/dashboard \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔐 Important Notes

⚠️ **For Development Only:**
- Uses mock authentication (no real OTP)
- Uses base64 tokens (not JWT — implement for production)
- Mock data in attendance/homework

✅ **For Production:**
1. Implement real OTP verification
2. Switch to JWT tokens
3. Add input validation
4. Secure Firebase rules
5. Use HTTPS only
6. Add rate limiting
7. Implement real attendance tracking

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module 'express'` | Run `bun install` in backend directory |
| `Firebase initialization error` | Check `.env` credentials, ensure Firestore is enabled |
| `CORS errors in console` | Backend CORS is enabled by default for development |
| `Student name not showing` | Check browser console for API errors, verify backend is running |
| `Port 3000 already in use` | Change `PORT=3001` in `.env` |

---

## 📞 Next Steps

1. **Connect Real Database:** Update Firestore credentials and test queries
2. **Implement OTP:** Add `twilio` or `firebase-auth` for real SMS OTP
3. **Add Admin Panel:** Create `/pages/admin.html` for managing students
4. **Implement Attendance:** Build real attendance tracking dashboard
5. **Payment Integration:** Add Razorpay/Stripe for fee payments
6. **Notifications:** Integrate Firebase Cloud Messaging

---

**Everything is ready! Start the backend and frontend, then test the complete flow.**

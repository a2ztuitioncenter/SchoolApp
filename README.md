# Tuition App - Full-Stack Application

A complete tuition management system built with **Bun**, **Express**, **Firebase Firestore**, and **Vanilla JavaScript**.

## 📁 Project Structure

```
tuition-app/
├── frontend/
│   ├── css/
│   │   └── style.css          # Dashboard styling
│   ├── js/
│   │   ├── api.js             # Central fetch() wrapper for backend calls
│   │   └── dashboard.js       # DOM manipulation & data population
│   └── pages/
│       └── student.html       # Student dashboard UI
│
├── backend/
│   ├── server.js              # Express server + Firebase init
│   ├── package.json           # Dependencies
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth/* endpoints
│   │   └── studentRoutes.js   # /api/student/* endpoints
│   ├── controllers/
│   │   ├── authController.js  # Login logic
│   │   └── dataController.js  # Student data fetching
│   └── models/
│       ├── User.js            # User schema & helpers
│       ├── Student.js         # Student schema & helpers
│       └── Fee.js             # Fee schema & helpers
│
└── .env.example               # Environment variable template
```

## 🚀 Quick Start

### Prerequisites
- **Bun** (https://bun.sh) - Modern JavaScript runtime
- **Firebase Project** with Firestore enabled
- **Node.js** (optional, but recommended for npm compatibility)

### 1. Clone & Setup

```bash
cd tuition-app/backend
bun install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CERT_URL=your-cert-url
FIREBASE_DATABASE_URL=your-database-url

# Server Configuration
PORT=3000
NODE_ENV=development
```

**To get Firebase credentials:**
1. Go to Firebase Console → Your Project → Settings (⚙️)
2. Service Accounts tab → Generate New Private Key
3. Copy the JSON credentials into your `.env` file

### 3. Start the Backend Server

```bash
bun run dev
```

Server will start at `http://localhost:3000`

### 4. Test the Backend

```bash
# Health check
curl http://localhost:3000/health

# Mock login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999999999","role":"student"}'
```

### 5. Open the Frontend

Open `frontend/pages/student.html` in your browser:
- Right-click → Open with Live Server (VS Code)
- Or use `python -m http.server 8000` in the frontend directory

## 📡 API Endpoints

### Authentication

#### Login (Mock)
- **POST** `/api/auth/login`
- **Body:** `{ "phone": "9876543210", "role": "student" }`
- **Response:** `{ token, userId, role, user, student }`

#### Verify Token
- **POST** `/api/auth/verify`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ valid, userId, role }`

### Student Data

#### Get Dashboard Data
- **GET** `/api/student/:userId/dashboard`
- **Response:** Profile, attendance, fees, homework, course progress

#### Get Attendance
- **GET** `/api/student/:userId/attendance`
- **Response:** Attendance records and summary

#### Get Fees
- **GET** `/api/student/:userId/fees`
- **Response:** Fee records and pending amounts

## 🔧 Development Guide

### Adding New Endpoints

1. **Create a Controller** (`backend/controllers/yourController.js`)
2. **Create a Route** (`backend/routes/yourRoutes.js`)
3. **Import in server.js** and add route: `app.use('/api/path', yourRoutes)`

### Adding New Collections to Firestore

1. Create a new model file: `backend/models/YourModel.js`
2. Define schema and helper functions
3. Import in controllers and use `req.db` to query

### Frontend Data Binding

1. Add `id` or `data-*` attributes to HTML elements
2. Create fetch calls in `api.js`
3. Call from `dashboard.js` and use `document.getElementById()` to update DOM

## 🔐 Security Notes

⚠️ **Development Only:**
- Mock login bypasses authentication
- Tokens are base64-encoded (not JWT)
- No real OTP verification

**For Production:**
- Implement JWT authentication
- Add OTP verification
- Use HTTPS only
- Never commit `.env` files
- Implement rate limiting
- Add request validation

## 🐛 Troubleshooting

### "Firebase initialization error"
- Check `.env` credentials are correct
- Ensure service account email has Firestore access
- Try running without Firebase credentials in dev mode

### "CORS error in frontend"
- Backend CORS is enabled by default
- If issues persist, check the origin in `server.js`

### "Cannot find module" Error
- Run `bun install` in backend directory
- Check that imports use `.js` extension

### Homework/Fees not showing
- Mock data is auto-generated for development
- Check browser console for API errors
- Verify backend is running on port 3000

## 📚 Key Features

✅ Student authentication (mock login)  
✅ Dashboard with profile, attendance, fees  
✅ Firebase Firestore integration  
✅ RESTful API with Express  
✅ Vanilla JavaScript frontend (no frameworks)  
✅ Responsive design  
✅ Extensible architecture  

## 📝 Next Steps

1. **Implement real OTP login**
2. **Add admin panel** for managing students/fees
3. **Implement attendance tracking UI**
4. **Add payment integration**
5. **Create teacher portal**
6. **Add notifications**

## 📧 Support

For issues or questions, check the comments in the code or review the API endpoint documentation above.

---

**Built with ❤️ using Bun, Express & Firebase**

# Tuition App - Frontend/Backend Connection Guide

## Overview
Your frontend connects to the backend via a configurable `BASE_API_URL`. This allows you to:
- Use **relative paths** in development (`/api`)
- Use **absolute URLs** in production (e.g., `https://api.vercel.app`)

---

## Development Setup

### Backend (Port 3000)
**File:** `backend/.env`
```
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
BASE_API_URL=http://localhost:3000
```

### Frontend (Port 3001 or other)
**File:** `frontend/.env`
```
# Leave empty or commented - defaults to '/api' (relative path to backend)
# VITE_BASE_API_URL=http://localhost:3000  # Uncomment only if backend is on different port
```

**Frontend API calls:**
- Automatically use `/api/...` endpoints
- Works because frontend and backend are served from the same origin during development

---

## Production Setup (Vercel)

### Scenario 1: Backend & Frontend in Same Vercel Project
- Deploy both as serverless functions
- Frontend can use relative `/api` paths
- **No configuration needed**

### Scenario 2: Backend in Separate Vercel Project
1. Deploy backend to Vercel (get domain: `https://tuition-app-backend.vercel.app`)
2. Deploy frontend to Vercel
3. **Set environment variable in frontend Vercel settings:**
   - **Setting Name:** `VITE_BASE_API_URL`
   - **Value:** `https://tuition-app-backend.vercel.app`
4. **Set environment variable in backend Vercel settings:**
   - **Setting Name:** `FRONTEND_URL`
   - **Value:** `https://tuition-app-frontend.vercel.app`

### Scenario 3: Custom API Domain
1. Deploy backend to your custom domain (e.g., `https://api.yourdomain.com`)
2. Deploy frontend to Vercel or your domain
3. **Frontend Vercel Environment Variables:**
   - **Setting Name:** `VITE_BASE_API_URL`
   - **Value:** `https://api.yourdomain.com`
4. **Backend `.env.production`:**
   - **Setting Name:** `FRONTEND_URL`
   - **Value:** Your frontend domain

---

## How It Works

### Frontend Request Flow
```
1. Frontend code calls: apiCall('/student/data')
2. api.js checks BASE_API_URL:
   - If undefined/empty: uses '/api' (relative path)
   - If defined: uses full URL like 'https://api.vercel.app'
3. Final request: POST https://api.vercel.app/api/student/data
```

### Backend CORS Configuration
Backend (`auth-middleware.js`) reads `FRONTEND_URL` to allow cross-origin requests:
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  // + development origins if NODE_ENV=development
];
```

---

## Environment Variables Summary

### Backend (`.env` or Vercel settings)
| Variable | Development | Production |
|----------|---|---|
| `NODE_ENV` | `development` | `production` |
| `PORT` | `3000` | `3000` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://your-frontend.vercel.app` |
| `BASE_API_URL` | `http://localhost:3000` | Not used by backend |
| Database vars | Local/Supabase dev | Production database |
| `JWT_SECRET` | Dev secret | Secure production secret |

### Frontend (`.env` or Vercel settings)
| Variable | Development | Production |
|----------|---|---|
| `VITE_BASE_API_URL` | (empty - uses `/api`) | `https://your-backend.vercel.app` |

---

## Testing

### Local Development
```bash
# Terminal 1: Backend
cd backend
npm install
npm start  # runs on http://localhost:3000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev  # runs on http://localhost:5173 or http://localhost:3001
```

Open frontend and check browser console:
```
[API] Using default relative path: /api
```

### Production Testing
1. Check frontend console after deployment
2. Should show logged BASE_API_URL being used
3. API calls should go to the configured backend URL

---

## Troubleshooting

### Frontend Can't Connect to Backend
**Symptoms:** CORS errors or 404 errors inNetwork tab

**Solution:**
1. Check `VITE_BASE_API_URL` is set correctly in Vercel
2. Ensure backend's `FRONTEND_URL` includes your frontend domain
3. Verify backend is running and accessible
4. Check backend CORS middleware allows your frontend origin

### API Returns 404
**Symptom:** `/api/...` endpoints return 404

**Solution:**
1. Check if BASE_API_URL includes trailing slash (it shouldn't)
2. Verify backend has `/api/...` routes defined
3. Check JWT_SECRET is consistent between deployments

### CORS Blocked Errors
**Solution:** Ensure backend's `FRONTEND_URL` matches exactly where frontend is deployed
- `https://example.com` ✅
- `https://example.com/` ❌ (trailing slash causes mismatch)

---

## Quick Reference: Vercel Deployment Checklist

- [ ] Backend deployed to Vercel
- [ ] Backend environment variables set (DATABASE_URL, JWT_SECRET, FRONTEND_URL)
- [ ] Frontend deployed to Vercel
- [ ] Frontend `VITE_BASE_API_URL` set to backend URL
- [ ] Test API calls in frontend (check console for BASE_API_URL)
- [ ] Test login/authentication flow
- [ ] Check CORS is working (Network tab shows successful CORS headers)

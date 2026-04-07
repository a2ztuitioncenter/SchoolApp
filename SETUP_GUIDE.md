# 🚀 Tuition App - Setup & Access Guide

## Quick Start (3 Steps)

### Step 1: Ensure PostgreSQL is Running
```powershell
# Windows: Check if PostgreSQL is running (usually auto-starts)
services.msc  # Look for "postgresql-x64-*"

# Verify connection:
node backend/check_db.js
```

### Step 2: Start Backend Server (Terminal 1)
```powershell
cd m:\WebDev\projects\tuition-app\backend
node src/server.js
```

✅ You should see:
```
╔═══════════════════════════════════════════════════════════╗
║               BACKEND SERVER STARTED                      ║
╚═══════════════════════════════════════════════════════════╝

Backend API Server: http://localhost:3000
```

### Step 3: Start Frontend Server (Terminal 2)
```powershell
cd m:\WebDev\projects\tuition-app\frontend
bun run server.ts
```

✅ You should see:
```
Frontend server running on port 8000
  Local: http://localhost:8000
  Network: http://0.0.0.0:8000
  Tunnel: Use your cloudflared tunnel URL
```

---

## 🌐 Access the App

### Option 1: Localhost (Same Machine)
- **Frontend:** http://localhost:8000
- **Backend Health:** http://localhost:3000/health

### Option 2: Local Network (IP Address)
- **Get your IP:** Run in PowerShell:
  ```powershell
  ipconfig
  # Look for "IPv4 Address" under your network adapter
  # Usually something like 192.168.*.*
  ```
- **Access:** `http://192.168.x.x:8000`

### Option 3: Cloudflared Tunnel
- **App works seamlessly** with your existing cloudflared setup
- No additional configuration needed

---

## 🔍 Verify Everything Works

Run this diagnostic test:
```powershell
cd m:\WebDev\projects\tuition-app
node test-connection.js
```

Expected output:
- ✅ Backend Health Check
- ✅ Frontend Server  
- ✅ API Proxy
- ✅ Database Connection

---

## 🐛 Troubleshooting

### Issue: Database not loading in browser
**Check:** Run `node test-connection.js` to see which component is failing

- ❌ Backend Health Check fails?
  - Ensure PostgreSQL is running
  - Check `.env` file in `backend/` folder
  
- ❌ Frontend Server fails?
  - Ensure port 8000 is free (check: `netstat -an | findstr 8000`)
  
- ❌ API Proxy fails?
  - Backend must be running on port 3000
  - Check firewall isn't blocking port 3000

### Issue: Only localhost works, not IP address
- ✅ **Fixed:** Server now listens on `0.0.0.0` (all interfaces)
- Ensure firewall allows ports 3000 and 8000

### Issue: Cloudflared tunnel not working
- ✅ **Fixed:** Frontend proxy now uses `localhost` instead of `127.0.0.1`
- Restart both servers after updating

---

## 📁 Configuration Files

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=tuition_app
PORT=3000
```

### Frontend (server.ts)
- Proxy forwards `/api` and `/uploads` to `http://localhost:3000`
- Listen on `0.0.0.0:8000` (all network interfaces)

---

## 🎯 Clean Access Paths

| Connection | URL |
|-----------|-----|
| **Localhost** | http://localhost:8000 |
| **Local Network** | http://192.168.x.x:8000 |
| **Cloudflared** | Your tunnel URL |
| **Backend API** | http://localhost:3000/api |
| **Health Check** | http://localhost:3000/health |

---

## ✅ All Fixes Applied

1. ✅ Frontend server now listens on `0.0.0.0` (all interfaces)
2. ✅ API proxy uses `localhost` (works with tunnel)
3. ✅ Enhanced `/health` endpoint with database status
4. ✅ Diagnostic test script (`test-connection.js`)
5. ✅ Improved server startup logs
6. ✅ API base URL is relative (works everywhere)

**The app now works seamlessly on:**
- localhost:8000
- IP:8000 (local network)
- cloudflared tunnel URL

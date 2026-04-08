# 🚀 RENDER DEPLOYMENT - SETUP INSTRUCTIONS

**⚠️ CRITICAL: Your app is down (Error 521) - Follow these steps to fix it**

---

## Issue: Web Server Down (Error 521)

**Causes:**
1. ❌ Bun runtime not installed in Render (build fails)
2. ❌ Environment variables not set (database connection fails)
3. ❌ Free tier instance spun down after inactivity
4. ❌ Port configuration incorrect

---

## 🔴 IMMEDIATE FIX - Render Dashboard Configuration

### Step 1: Access Your Render Service

1. Go to: https://dashboard.render.com/
2. Click on your "tuition-app-backend" service
3. Click the **Settings** tab

### Step 2: Set Build Command

In **Build & Deploy** section:

**Build Command**:
```bash
npm install -g bun && cd backend && bun install && cd ../frontend && bun install
```

Or simpler Node.js version (if Bun fails):
```bash
cd backend && npm install && cd ../frontend && npm install
```

### Step 3: Set Start Command  

**Start Command**:
```bash
cd backend && bun run src/server.js
```

OR if using Node.js:
```bash
cd backend && npm start
```

### Step 4: Set Environment Variables

Go to **Environment** tab and add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | Leave blank* | Render auto-assigns |
| `DATABASE_URL` | `postgresql://...` | Get from Supabase |
| `DB_USER` | `postgres.xxxxx` | From Supabase |
| `DB_PASSWORD` | `<your-password>` | From Supabase - rotated password |
| `DB_HOST` | `xxxxx.postgres.supabase.co` | From Supabase |
| `DB_PORT` | `5432` | Standard Postgres port |
| `DB_NAME` | `postgres` | Supabase database name |
| `DB_SSL` | `true` | For production |
| `CORS_ORIGIN` | `https://your-frontend-url.vercel.app` | Your Vercel domain |

*For PORT: Leave empty or don't set it - Render will auto-assign and expose it

### Step 5: Trigger Redeploy

1. Go to **Deploys** tab
2. Click the three dots (•••) on latest deploy
3. Click **Redeploy**
4. Wait 3-5 minutes for deployment
5. Once "Live", try accessing your app

---

## ✅ For Your Frontend (Vercel)

The 404 error on Vercel is likely because:

1. **No build command set** - Vercel doesn't know to bundle your frontend
2. **Wrong routing** - SPA routes need to fallback to index.html

### Fix Vercel Frontend

Go to **Vercel Dashboard** → Your Project → **Settings** → **Build & Development Settings**:

**Framework Preset**: Custom  
**Build Command**: 
```bash
# If using bun
bun build frontend
```

**Output Directory**: `frontend/dist` (or `frontend/` if no build)

**Root Directory** (optional): `./`

Then in **Deployment** tab, check for build logs to see exact error.

---

## 🆘 Common Render Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Error 521 | Backend crashed | Check Logs tab for errors |
| Instance spins down | Free tier inactivity | Upgrade to paid or add uptime monitor |
| DB connection timeout | Env vars not set | Set all DATABASE_* variables |
| Bun not found | Not installed in build | Use Node.js or install Bun in build cmd |
| 404 on root | Frontend not served | Check backend routes serve index.html |

---

## 📋 Debugging Steps

### 1. Check Render Logs

On your Render service:
1. Click **Logs** tab (bottom of page)
2. Look for errors like:
   - `ECONNREFUSED` - Database not reachable
   - `Cannot find module` - Dependency not installed
   - `listen EADDRINUSE` - Port conflict

### 2. Test Backend Health

Once deployed and "Live", test:
```bash
curl https://your-render-url.onrender.com/health
```

Should return `200 OK`

### 3. Check Environment Variables

In Render dashboard **Settings** → **Environment**:
- Verify all DB_* variables are set
- Verify DATABASE_URL is complete
- No typos in variable names

### 4. Verify Database Connection

SSH into Render container via Render dashboard and test:
```bash
npm install -g pg-cli
psql $DATABASE_URL -c "SELECT NOW();"
```

---

## 🔄 Free Tier Limitations (Why it keeps going down)

**Free Tier Render Spins Down:**
- After 15 minutes of **no incoming requests**
- Startup takes 30-50 seconds
- Requests time out during startup

**Solutions:**
1. **Upgrade to Paid** (recommended for production) - $7/month
2. **Add Uptime Monitor** - Ping every 15 minutes to keep alive
   - Use: https://uptimerobot.com (free)
   - Set to hit: `https://your-app.onrender.com/health` every 10 minutes

---

## 🚀 What to Do Right Now

### Priority 1: Fix Render Backend
1. ✅ Go to Render Dashboard
2. ✅ Set Build Command (from above)
3. ✅ Set Start Command (from above)
4. ✅ Set all Environment Variables
5. ✅ Click "Redeploy"
6. ✅ Wait 3-5 minutes
7. ✅ Test `/health` endpoint

### Priority 2: Fix Vercel Frontend  
1. ✅ Go to Vercel Dashboard
2. ✅ Check Build Command
3. ✅ Check Output Directory
4. ✅ Rebuild
5. ✅ Test frontend loads
6. ✅ Update CORS_ORIGIN in backend if needed

### Priority 3: Keep Render Alive
1. ✅ Sign up for UptimeRobot (free)
2. ✅ Create monitor for `https://your-app.onrender.com/health`
3. ✅ Set interval to 10 minutes

---

## 📝 Your Render Service Details

Based on dashboard screenshot:
- **Service**: SchoolApp
- **Type**: Node web service (Free tier)
- **URL**: https://schoolapp-bu95.onrender.com
- **Region**: Oregon
- **GitHub**: uddineumuslim/SchoolApp (main branch)
- **Auto-Deploy**: Enabled ✓

---

## ⚠️ After Fixing Issues

1. **Test login** - Try student/teacher/admin login
2. **Monitor logs** - Watch for any errors post-deploy
3. **Verify database** - Check data loads correctly
4. **Test file uploads** - If your app has uploads
5. **Monitor uptime** - Use UptimeRobot to keep it alive

---

## 🆘 Still Not Working?

Check Render **Logs** for these errors and what to do:

```
Error: Cannot find module 'bun'
→ Fix: Use Node.js build/start commands instead

Error: ECONNREFUSED 127.0.0.1:5432
→ Fix: DATABASE_URL environment variable not set

Error: connect ECONNREFUSED
→ Fix: DB_HOST or DATABASE_URL is wrong

Error: listen EADDRINUSE
→ Fix: PORT variable should not be set (Render assigns it)

Error: Cannot GET /
→ Fix: Backend routes not configured to serve frontend
```

---

**Next Step**: Go to https://dashboard.render.com and apply the configuration above. Your app should be live in 5-10 minutes!

# PRODUCTION DEPLOYMENT CHECKLIST

## ✅ Pre-Deployment Verification

### Environment Setup
- [ ] Copy `.env.example` to `.env` and configure for production
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (minimum 32 characters)
- [ ] Set production `FRONTEND_URL` (e.g., https://your-domain.com)
- [ ] Configure `DB_HOST`, `DB_USER`, `DB_PASSWORD` for production database
- [ ] Ensure `DB_SSL=true` for production databases

### Security & Cleanup
- [ ] All `console.log()` statements removed (except errors)
- [ ] No hardcoded credentials anywhere
- [ ] `.env` file is in `.gitignore`
- [ ] No test/debug files in production
- [ ] JWT secret is strong and unique

### Backend Verification
- [ ] Database migrations run successfully
- [ ] All routes tested with production data
- [ ] Error handling works correctly (no stack traces in responses)
- [ ] CORS properly configured for production frontend
- [ ] Rate limiting configured appropriately
- [ ] File uploads path is writable

### Frontend Verification
- [ ] API calls use relative `/api` paths (not hardcoded URLs)
- [ ] Auth token properly stored and retrieved
- [ ] No development URLs in frontend code
- [ ] All dashboards (admin, teacher, student) tested
- [ ] Mobile responsive design works

### API Endpoints
- [ ] All authentication endpoints working
- [ ] Admin dashboard data loads correctly
- [ ] Teacher dashboard timetable displays
- [ ] Student dashboard loads materials
- [ ] File uploads work without errors
- [ ] Real-time data refresh working (30-second intervals)

### Database
- [ ] Database backup strategy in place
- [ ] Connection pooling configured
- [ ] SSL encryption enabled
- [ ] Proper indexes on frequently queried columns

### Monitoring
- [ ] Error logging configured
- [ ] Health check endpoint `/health` working
- [ ] Performance metrics tracked
- [ ] No memory leaks in websocket handlers

## 🚀 Deployment Steps

1. Build frontend static files (if using build tool)
2. Push code to git repository
3. Deploy to Render:
   - Connect GitHub repository
   - Set environment variables in Render dashboard
   - Configure database connection string
   - Set build command: `bun install && bun run src/server.js`
   - Set output directory (if applicable)

4. Verify deployment:
   - Check `/health` endpoint returns 200
   - Test login for all roles (admin, teacher, student)
   - Verify real-time data updates
   - Test file uploads
   - Monitor logs for errors

## ⚠️ Post-Deployment

- [ ] Monitor application logs for errors
- [ ] Verify all users can login
- [ ] Test data persistence
- [ ] Check performance metrics
- [ ] Set up backup strategy
- [ ] Configure monitoring/alerting

## 📊 Performance Targets

- Response time: < 500ms for most requests
- Database query time: < 100ms
- File upload limit: 50MB
- Concurrent users: 100+
- Uptime: 99.9%

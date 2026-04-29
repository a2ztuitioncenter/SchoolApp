import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars as early as possible
dotenv.config({ path: path.join(__dirname, '../.env') });

import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';


import authRoutes from './features/auth/authRoutes.js';
import studentRoutes from './features/student/studentRoutes.js';
import adminRoutes from './features/admin/adminRoutes.js';
import teacherRoutes from './features/teacher/teacherRoutes.js';
import attendanceRoutes from './features/attendance/attendanceRoutes.js';
import homeworkRoutes   from './features/homework/homeworkRoutes.js';
import feeRoutes        from './features/fees/feeRoutes.js';
import materialsRoutes from './features/materials/materialsRoutes.js';
import notificationsRoutes from './features/notifications/notificationsRoutes.js';
import resultsRoutes    from './features/results/resultsRoutes.js';
import downloadRoutes   from './features/download/downloadRoutes.js';
import subjectsRoutes   from './features/subjects/subjectsRoutes.js';
import storageRoutes    from './features/storage/storageRoutes.js';
import profileRoutes    from './features/profile/profileRoutes.js';
import contentRoutes    from './features/content/contentRoutes.js';
import submissionRoutes from './features/submissions/submissionRoutes.js';
import assignmentRoutes from './features/homework/assignmentRoutes.js';
import { authenticate, authorize, rateLimiter, validateInput, corsSecure, securityLogger, csrfProtection } from './middleware/auth-middleware.js';

import { initializeDatabase } from './config/database.js';

import fs from 'fs';


// Ensure upload directories exist (relative to CWD, which is backend root)
['uploads/materials', 'uploads/homework', 'uploads/notifications'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

import pool from './config/pool.js';

// Test the connection
try {
  const client = await pool.connect();
  console.log('PostgreSQL Database connected successfully');
  client.release();
} catch (error) {
  console.error('PostgreSQL connection error:', error.message);
  console.error('Ensure PostgreSQL is running and your .env file is configured correctly.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy for production (Render/Vercel)
if (isProd) {
  app.set('trust proxy', 1);
}

// Security middleware first
app.use(corsSecure());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(validateInput);
app.use(rateLimiter(100, 60000));
app.use(csrfProtection);
app.use(securityLogger);

// Attach Database Pool to Request
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[EXPRESS ${req.method}] ${req.url}`);
  next();
});

// Serve index.html (master landing / login selector) on root route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../../frontend/index.html');
  res.sendFile(indexPath);
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Routes
app.use('/api/auth', authRoutes); // Auth routes are public for login/register

// Protected routes - Require authentication
app.use('/api/student', authenticate, studentRoutes);
app.use('/api/admin', authenticate, authorize('admin'), adminRoutes);
app.use('/api/teacher', authenticate, authorize(['teacher', 'staff', 'admin']), teacherRoutes);

// Admin Module Routes (from verification requirements)
app.use('/api/admin/attendance', authenticate, authorize('admin'), attendanceRoutes);
app.use('/api/admin/homework', authenticate, authorize('admin'), homeworkRoutes);
app.use('/api/admin/fees', authenticate, authorize('admin'), feeRoutes);
app.use('/api/materials', authenticate, materialsRoutes);
app.use('/api/admin/notifications', authenticate, authorize('admin'), notificationsRoutes);
app.use('/api/admin/results', authenticate, authorize('admin'), resultsRoutes);
app.use('/api/download', authenticate, downloadRoutes); // Download available to authenticated users
app.use('/api/subjects', authenticate, subjectsRoutes); // Combined RBAC internally
app.use('/api/storage', authenticate, storageRoutes); // Storage routes (upload, files, download)
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/content', authenticate, contentRoutes);
app.use('/api/submissions', authenticate, submissionRoutes);
app.use('/api/assignments', authenticate, assignmentRoutes);

// PUBLIC content route (no auth required — for landing page)
const PUBLIC_CONTENT_KEYS = ['programs', 'resources', 'contact', 'privacy', 'learn-more', 'terms', 'help', 'documentation'];
app.get('/api/public/content/:key', async (req, res) => {
  const { key } = req.params;
  if (!PUBLIC_CONTENT_KEYS.includes(key)) {
    return res.status(400).json({ success: false, error: 'Invalid content key' });
  }
  try {
    const result = await pool.query(
      'SELECT key, content, updated_at FROM content_pages WHERE key = $1',
      [key]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Public content fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch content' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({ 
      status: 'Healthy',
      server: 'Running',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'Unhealthy',
      server: 'Running',
      database: 'Disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Fallback: serve index.html for unknown routes
app.use((req, res) => {
  const indexPath = path.join(__dirname, '../../frontend/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err.message);
      res.status(404).json({ error: 'Page not found' });
    }
  });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

// Database Initialization & Start Server
const startServer = async () => {
  try {
    const shouldInitializeDB = process.env.INITIALIZE_DB === 'true';

    if (shouldInitializeDB) {
      console.log('Initializing database tables and creating default admin...');
      await initializeDatabase();
    }

    // Start background jobs
    import('./utils/cleanupJob.js').then(({ startCleanupJob }) => {
      startCleanupJob(pool);
    }).catch(err => console.error('Failed to load cleanup job:', err));

    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n╔═══════════════════════════════════════════════════════════╗');
      console.log('║               BACKEND SERVER STARTED                      ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');
      console.log(`Backend API Server: http://localhost:${PORT}`);
      console.log(`  • Local: http://localhost:${PORT}/health`);
      console.log(`  • Network: http://0.0.0.0:${PORT}/health`);
      console.log(`  • Database: Connected ✓\n`);
      console.log(`Quick Links:`);
      console.log(`  • Student Login: http://localhost:${PORT}/student-login.html`);
      console.log(`  • Admin Login: http://localhost:${PORT}/admin-login.html`);
      console.log(`  • Teacher Login: http://localhost:${PORT}/teacher-login.html`);
      console.log(`  • Health Check: http://localhost:${PORT}/health\n`);
      console.log("Server is RUnning ...")
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env file if it exists, but do not overwrite system environment variables
// (This supports Render dashboard vars, Docker Compose, and local dev)
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
import pool from './config/pool.js';

// Ensure upload directories exist (relative to CWD, which is backend root)
['uploads/materials', 'uploads/homework', 'uploads/notifications'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Global Exception Handlers (Critical for Production Debugging)
process.on('uncaughtException', (err) => {
  console.error('\nFATAL ERROR: Uncaught Exception');
  console.error(err.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise);
  console.error('Reason:', reason.stack || reason);
  // Do NOT exit — let the process manager (Render) handle restarts if needed.
  // Exiting here on transient DB errors causes unnecessary crash loops.
});

// Environment Validation
const validateEnv = () => {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_PHONE', 'ADMIN_PASSWORD', 'ADMIN_USERNAME'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('\nCONFIGURATION ERROR: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease ensure these are set in your Render dashboard or .env file.\n');
    process.exit(1);
  }
  console.log('[INIT] Environment variables validated.');
};

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy for production (Render/Vercel)
if (isProd) {
  console.log('[INIT] Running in PRODUCTION mode (Trust Proxy enabled)');
  app.set('trust proxy', 1);
} else {
  console.log('[INIT] Running in DEVELOPMENT mode');
}

// Database Initialization & Start Server
const startServer = async () => {
  try {
    console.log('[INIT] Starting Backend Server Initialization...');
    
    // 1. Validate Environment
    validateEnv();

    // 2. Test Database Connection
    console.log('[INIT] Connecting to database...');
    try {
      const client = await pool.connect();
      console.log('[INIT] PostgreSQL Database connected successfully');
      client.release();
    } catch (dbError) {
      console.error('[FATAL] DATABASE CONNECTION FAILED:');
      console.error(dbError.message);
      console.error('Check your DATABASE_URL and SSL settings.');
      process.exit(1);
    }

    // 3. Security & Middleware
    console.log('[INIT] Initializing security middleware...');
    app.use(compression());
    app.use(corsSecure());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(validateInput);
    app.use(rateLimiter(100, 60000));
    app.use(csrfProtection);

    // Attach Database Pool to Request
    app.use((req, res, next) => {
      req.db = pool;
      next();
    });

    // Global Request Logger
    app.use((req, res, next) => {
      if (!isProd || req.url !== '/health') {
        console.log(`[EXPRESS ${req.method}] ${req.url}`);
      }
      next();
    });

    // 4. Static Files & Landing Page
    console.log('[INIT] Setting up static file serving...');
    app.get('/', (req, res) => {
      const indexPath = path.join(__dirname, '../../frontend/index.html');
      res.sendFile(indexPath);
    });

    app.use(express.static(path.join(__dirname, '../../frontend')));
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    app.get('/favicon.ico', (req, res) => res.status(204).end());

    // 5. Routes
    console.log('[INIT] Loading API routes...');
    app.use('/api/auth', authRoutes);
    app.use('/api/student', authenticate, studentRoutes);
    app.use('/api/admin', authenticate, authorize('admin'), adminRoutes);
    app.use('/api/teacher', authenticate, authorize(['teacher', 'staff', 'admin']), teacherRoutes);
    app.use('/api/admin/attendance', authenticate, authorize('admin'), attendanceRoutes);
    app.use('/api/admin/homework', authenticate, authorize('admin'), homeworkRoutes);
    app.use('/api/admin/fees', authenticate, authorize('admin'), feeRoutes);
    app.use('/api/materials', authenticate, materialsRoutes);
    app.use('/api/admin/notifications', authenticate, authorize('admin'), notificationsRoutes);
    app.use('/api/admin/results', authenticate, authorize('admin'), resultsRoutes);
    app.use('/api/download', authenticate, downloadRoutes);
    app.use('/api/subjects', authenticate, subjectsRoutes);
    app.use('/api/storage', authenticate, storageRoutes);
    app.use('/api/profile', authenticate, profileRoutes);
    app.use('/api/content', authenticate, contentRoutes);
    app.use('/api/submissions', authenticate, submissionRoutes);
    app.use('/api/assignments', authenticate, assignmentRoutes);

    // Public content route
    const PUBLIC_CONTENT_KEYS = ['programs', 'resources', 'contact', 'privacy', 'learn-more', 'terms', 'help', 'documentation'];
    app.get('/api/public/content/:key', async (req, res) => {
      try {
        const { key } = req.params;
        if (!PUBLIC_CONTENT_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
        const result = await pool.query('SELECT key, content, updated_at FROM content_pages WHERE key = $1', [key]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error('[PUBLIC CONTENT] Error:', error.message);
        res.status(500).json({ error: 'Failed to load content' });
      }
    });

    // Health check
    app.get('/health', async (req, res) => {
      try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        res.json({ status: 'Healthy', timestamp: new Date().toISOString() });
      } catch (error) {
        res.status(503).json({ status: 'Unhealthy' });
      }
    });

    // Fallback
    app.use((req, res) => {
      const indexPath = path.join(__dirname, '../../frontend/index.html');
      res.sendFile(indexPath, (err) => {
        if (err) res.status(404).json({ error: 'Page not found' });
      });
    });

    // Error Handling
    app.use((err, req, res, next) => {
      console.error('Unexpected error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // 6. DB Initialization (Conditional)
    const shouldInitializeDB = process.env.INITIALIZE_DB === 'true';
    if (shouldInitializeDB) {
      console.log('[INIT] Initializing database schema...');
      await initializeDatabase();
    }

    // 7. Background Jobs
    console.log('[INIT] Starting background jobs...');
    import('./utils/cleanupJob.js').then(({ startCleanupJob }) => {
      startCleanupJob(pool);
    }).catch(err => console.error('Failed to load cleanup job:', err));

    // 8. Listen
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n+-----------------------------------------------------------+');
      console.log('|               BACKEND SERVER STARTED                      |');
      console.log('+-----------------------------------------------------------+\n');
      console.log(`  Backend API Server: http://localhost:${PORT}`);
      console.log(`  Health Check:       http://localhost:${PORT}/health`);
      console.log(`  Database:           Connected\n`);
    });

  } catch (error) {
    console.error('\nFAILED TO START SERVER:');
    console.error(error.stack || error);
    process.exit(1);
  }
};

startServer();

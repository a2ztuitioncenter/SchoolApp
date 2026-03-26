import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import homeworkRoutes   from './routes/homeworkRoutes.js';
import feeRoutes        from './routes/feeRoutes.js';
import materialsRoutes  from './routes/materialsRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import resultsRoutes    from './routes/resultsRoutes.js';

import { initializeDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;
dotenv.config();

// PostgreSQL Connection Pool Setup
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tuition_app',
  max: process.env.DB_CONNECTION_LIMIT || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
try {
  const client = await pool.connect();
  console.log('✅ PostgreSQL Database connected successfully');
  client.release();
} catch (error) {
  console.error('❌ PostgreSQL connection error:', error.message);
  console.error('Ensure PostgreSQL is running and your .env file is configured correctly.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Attach Database Pool to Request
app.use((req, res, next) => {
  req.db = pool;
  next();
});
app.use(express.urlencoded({ extended: true }));

// Serve index.html (master landing / login selector) on root route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/index.html');
  res.sendFile(indexPath);
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);

// Admin Module Routes (from verification requirements)
app.use('/api/admin/attendance', attendanceRoutes);
app.use('/api/admin/homework', homeworkRoutes);
app.use('/api/admin/fees', feeRoutes);
app.use('/api/admin/materials', materialsRoutes);
app.use('/api/admin/notifications', notificationsRoutes);
app.use('/api/admin/results', resultsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Fallback: serve index.html for unknown routes
app.use((req, res) => {
  const indexPath = path.join(__dirname, '../frontend/index.html');
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
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Database Initialization & Start Server
const startServer = async () => {
  try {
    const shouldInitializeDB = process.env.INITIALIZE_DB === 'true';

    if (shouldInitializeDB) {
      console.log('📋 Initializing database tables and creating default admin...');
      await initializeDatabase(pool);
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running at http://localhost:${PORT}`);
      console.log(`📚 Master Portal: http://localhost:${PORT}/`);
      console.log(`👤 Student Login: http://localhost:${PORT}/student-login.html`);
      console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin-login.html`);
      console.log(`🎓 Teacher Login: http://localhost:${PORT}/teacher-login.html\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
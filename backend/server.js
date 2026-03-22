import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import { initializeDatabase, seedDatabase } from './database.js';

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
  console.log('PostgreSQL Database connected successfully');
  client.release();
} catch (error) {
  console.error('PostgreSQL connection error:', error.message);
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
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
    const shouldSeedDB = process.env.SEED_DB === 'true';

    if (shouldInitializeDB) {
      console.log('Initializing database tables...');
      await initializeDatabase(pool);
    }

    if (shouldSeedDB) {
      console.log('Seeding database with sample data...');
      await seedDatabase(pool);
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Dashboard: http://localhost:8000`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
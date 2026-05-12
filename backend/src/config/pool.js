/**
 * pool.js - Shared database connection pool.
 * Separate from database.js to avoid circular imports with models.
 */
import pkg from 'pg';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration is handled globally in server.js

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const { Pool } = pkg;

const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('db:5432') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

export default pool;

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

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded" : "Missing");

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;

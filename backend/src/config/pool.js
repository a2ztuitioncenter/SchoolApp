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

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pkg;

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'tuition_app'
    };

const pool = new Pool(poolConfig);

export default pool;

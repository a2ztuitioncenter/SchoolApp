/**
 * Migration: Add username column to users table
 * - Adds nullable username column
 * - Backfills existing users with user_<id>
 * - Sets NOT NULL constraint
 * - Creates unique index on LOWER(username)
 *
 * Run: node migrations/add_username_column.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('1. Adding username column (nullable)...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
    `);

    console.log('2. Backfilling existing users with user_<id>...');
    await client.query(`
      UPDATE users SET username = CONCAT('user_', id) WHERE username IS NULL;
    `);

    console.log('3. Setting NOT NULL constraint...');
    await client.query(`
      ALTER TABLE users ALTER COLUMN username SET NOT NULL;
    `);

    console.log('4. Creating unique index on LOWER(username)...');
    // Drop first in case of re-run
    await client.query(`DROP INDEX IF EXISTS idx_users_username_lower;`);
    await client.query(`
      CREATE UNIQUE INDEX idx_users_username_lower ON users (LOWER(username));
    `);

    await client.query('COMMIT');
    console.log('✅ Migration complete: username column added successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));

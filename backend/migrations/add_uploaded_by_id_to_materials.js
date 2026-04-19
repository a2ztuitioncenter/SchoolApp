/**
 * Migration: Add uploaded_by_id to materials table
 * - Adds uploaded_by_id column as FK to users(id)
 * - Backfills from uploaded_by (phone) to userId lookup
 * - Keeps uploaded_by for backward compatibility
 * - Adds indexes for performance
 *
 * Run: node migrations/add_uploaded_by_id_to_materials.js
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

    console.log('1. Adding uploaded_by_id column to materials table...');
    await client.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);

    console.log('2. Backfilling uploaded_by_id from uploaded_by (phone)...');
    await client.query(`
      UPDATE materials m
      SET uploaded_by_id = u.id
      FROM users u
      WHERE m.uploaded_by IS NOT NULL
        AND u.phone = m.uploaded_by
        AND m.uploaded_by_id IS NULL;
    `);

    console.log('3. Creating index on uploaded_by_id for performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by_id ON materials(uploaded_by_id);
    `);

    console.log('4. Creating index on class_level and section for student queries...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_class_section ON materials(class_level, section);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

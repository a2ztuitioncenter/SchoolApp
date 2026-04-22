import pool from '../config/pool.js';

async function migrate() {
  try {
    console.log('Adding section column to attendance table...');
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS section VARCHAR(10) DEFAULT 'A'`);
    console.log('Successfully added section column.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();

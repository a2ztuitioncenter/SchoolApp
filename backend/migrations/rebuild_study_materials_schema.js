import pool from '../src/config/pool.js';
import { materialModel } from '../src/features/materials/Material.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(materialModel.schema);
    await client.query('COMMIT');
    console.log('Study material schema migration completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Study material schema migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();


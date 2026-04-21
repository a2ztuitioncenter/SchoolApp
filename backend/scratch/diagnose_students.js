import pool from '../src/config/pool.js';

async function diagnose() {
  try {
    const res = await pool.query('SELECT * FROM students LIMIT 1');
    if (res.rows.length > 0) {
      console.log('Columns in students table:', Object.keys(res.rows[0]));
    } else {
      console.log('No students found to check columns.');
      // Fallback: check table schema directly
      const schemaRes = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'students'
      `);
      console.log('Columns in students table (via information_schema):', schemaRes.rows.map(r => r.column_name));
    }
  } catch (err) {
    console.error('Diagnosis failed:', err);
  } finally {
    await pool.end();
  }
}

diagnose();

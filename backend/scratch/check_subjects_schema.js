import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'm:/WebDev/projects/tuition-app/backend/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function describeTable() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subjects'
    `);
    console.log('Subjects Table Columns:');
    res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

describeTable();

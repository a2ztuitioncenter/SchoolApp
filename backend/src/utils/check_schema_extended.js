import pool from '../config/pool.js';

async function check() {
  const tables = ['homework', 'syllabus', 'timetable', 'subject_assignments'];
  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`${table} columns:`, res.rows.map(r => r.column_name));
    } catch (err) {
      console.error(`Error checking ${table}:`, err.message);
    }
  }
  await pool.end();
}

check();

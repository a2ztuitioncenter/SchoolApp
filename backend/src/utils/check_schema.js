import pool from '../config/pool.js';

async function check() {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance'`);
    console.log('Attendance columns:', res.rows.map(r => r.column_name));
    
    const studentsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'students'`);
    console.log('Students columns:', studentsRes.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();

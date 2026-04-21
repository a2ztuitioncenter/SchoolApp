import pool from '../src/config/pool.js';

async function diagnose() {
  const tables = ['students', 'attendance', 'fees', 'homework', 'exam_results', 'syllabus', 'notifications', 'timetable'];
  
  for (const table of tables) {
    try {
      console.log(`\n--- TABLE: ${table} ---`);
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
        ORDER BY ordinal_position
      `);
      console.log('Columns:', cols.rows.map(r => `${r.column_name} (${r.data_type})`));
      
      const sample = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
      if (sample.rows.length > 0) {
        console.log('Sample Row keys:', Object.keys(sample.rows[0]));
      } else {
        console.log('Sample Row: (empty)');
      }
    } catch (e) {
      console.error(`Error diagnosing ${table}:`, e.message);
    }
  }
  await pool.end();
}

diagnose();

import db from '../src/config/database.js';

async function diagnose() {
  const tables = ['homework', 'teacher_class_assignment', 'students', 'timetable'];
  console.log('--- Teacher Module Table Diagnostics ---');

  for (const table of tables) {
    try {
      const res = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`\nTable: ${table}`);
      console.log('Columns:', res.rows.map(r => r.column_name));
    } catch (e) {
      console.log(`\n❌ Table: ${table} check failed: ${e.message}`);
    }
  }
  process.exit(0);
}

diagnose();

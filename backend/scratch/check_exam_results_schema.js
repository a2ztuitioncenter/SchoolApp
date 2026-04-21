import db from '../src/config/database.js';

async function check() {
  try {
    const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'exam_results'");
    console.log("COLUMNS:", res.rows.map(r => r.column_name));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
check();

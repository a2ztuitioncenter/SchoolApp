import db from '../src/config/database.js';

async function check() {
  try {
    const res = await db.query('SELECT id, name, "rollNumber" FROM students LIMIT 5');
    console.log("STUDENTS:", res.rows);
    const res2 = await db.query('SELECT * FROM exam_results LIMIT 5');
    console.log("EXAM_RESULTS:", res2.rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
check();

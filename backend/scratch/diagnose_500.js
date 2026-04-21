import db from '../src/config/database.js';

async function diagnose() {
  const userId = 22;
  console.log(`--- Diagnostics for userId ${userId} ---`);

  try {
    // 1. Check student
    const studentRes = await db.query('SELECT * FROM students WHERE "userId" = $1', [userId]);
    if (studentRes.rows.length === 0) {
      console.log('❌ Student not found for userId 22');
    } else {
      console.log('✅ Student found:', JSON.stringify(studentRes.rows[0], null, 2));
      const student = studentRes.rows[0];

      // 2. Check exam_results schema and data
      try {
        const columns = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'exam_results'");
        console.log('exam_results columns:', columns.rows.map(r => r.column_name));
        
        const resultsRes = await db.query('SELECT * FROM exam_results WHERE "studentId" = $1 LIMIT 1', [student.id]);
        console.log('✅ exam_results check passed');
      } catch (e) {
        console.log('❌ exam_results check failed:', e.message);
      }

      // 3. Check homework
      try {
        await db.query('SELECT * FROM homework LIMIT 1');
        console.log('✅ homework table exists');
      } catch (e) {
        console.log('❌ homework check failed:', e.message);
      }

      // 4. Check timetable
      try {
        await db.query('SELECT * FROM timetable LIMIT 1');
        console.log('✅ timetable table exists');
      } catch (e) {
        console.log('❌ timetable check failed:', e.message);
      }

      // 5. Check notifications
      try {
        await db.query('SELECT * FROM notifications LIMIT 1');
        console.log('✅ notifications table exists');
      } catch (e) {
        console.log('❌ notifications check failed:', e.message);
      }
    }
  } catch (e) {
    console.error('General failure:', e);
  }
  process.exit(0);
}

diagnose();

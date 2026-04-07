import pool from './config/database.js';

async function testMarkAll() {
  try {
    const classLevel = '10';
    console.log(`Fetching students for class ${classLevel}...`);
    const studentsRes = await pool.query('SELECT id, name FROM students WHERE "classLevel" = $1', [classLevel]);
    const students = studentsRes.rows;
    console.log(`Found ${students.length} students.`);

    const date = '2026-04-07';
    const records = students.map(s => ({
      studentId: s.id,
      classLevel: classLevel,
      date: date,
      status: 'present'
    }));
    
    console.log('Testing markBulk for all students...');
    const results = [];
    for (const rec of records) {
      const studentId = rec.studentId;
      const r = await pool.query(
        `INSERT INTO attendance ("studentId", "classLevel", date, status, "userId")
         VALUES ($1, $2, $3, $4, (SELECT "userId" FROM students WHERE id = $1))
         ON CONFLICT ("studentId", date)
         DO UPDATE SET status = EXCLUDED.status, "classLevel" = EXCLUDED."classLevel"
         RETURNING *`,
        [studentId, rec.classLevel, rec.date, rec.status]
      );
      results.push(r.rows[0]);
    }
    console.log(`Success! Marked ${results.length} students.`);
  } catch (err) {
    console.error('FAILED!');
    console.error('Message:', err.message);
    console.error('Detail:', err.detail);
    console.error('Code:', err.code);
  } finally {
    await pool.end();
    process.exit();
  }
}

testMarkAll();

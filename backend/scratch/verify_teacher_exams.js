import db from '../src/config/pool.js';

async function verify() {
  const teacherId = 1; 
  console.log(`--- Verifying Teacher Exam Results Logic for teacherId ${teacherId} ---`);

  try {
    const results = await db.query(
      `SELECT er.id, er."classLevel", er.section, COALESCE(s."rollNumber", er."rollNumber") as "rollNumber",
              er."studentName", er."examTitle", er.subjects, 
              er."totalMarks", er."obtainedMarks", 
              er.percentage, er.remarks, er."teacherId", er."createdAt"
       FROM exam_results er
       LEFT JOIN students s ON er."studentId" = s.id
       WHERE er."teacherId" = $1 
       ORDER BY er."createdAt" DESC`,
      [teacherId]
    );
    console.log('✅ Successfully fetched exam result records:', results.rows.length);
    if (results.rows.length > 0) {
      console.log('Sample Result:', JSON.stringify(results.rows[0], null, 2));
    }
  } catch (e) {
    console.error('❌ Verification failed:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

verify();

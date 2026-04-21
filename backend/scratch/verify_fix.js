import db from '../src/config/database.js';

async function verify() {
  const userId = 22;
  const studentId = 11;
  const classLevel = '10';
  const section = 'A';

  console.log('--- Verifying Student API Queries ---');

  try {
    // 1. Test results query (from studentRoutes.js)
    console.log('\n1. Testing Results Query...');
    const results = await db.query(
      `SELECT er.*, s."rollNumber" as "roll_no"
       FROM exam_results er
       LEFT JOIN students s ON er."studentId" = s.id
       WHERE er."studentId" = $1
       ORDER BY er."createdAt" DESC`,
      [studentId]
    );
    console.log('✅ Results query success. Count:', results.rows.length);

    // 2. Test dashboard homework query (from dataController.js)
    console.log('\n2. Testing Homework Query...');
    const homework = await db.query(
      `SELECT * FROM homework 
       WHERE "classLevel" = $1 AND (section = $2 OR section = 'ALL')
       ORDER BY "dueDate" ASC, "createdAt" DESC LIMIT 15`, 
      [classLevel, section]
    );
    console.log('✅ Homework query success. Count:', homework.rows.length);

    // 3. Test timetable query
    console.log('\n3. Testing Timetable Query...');
    const timetable = await db.query(
      `SELECT * FROM timetable 
       WHERE "classLevel" = $1 AND (section = $2 OR section = 'ALL') 
       ORDER BY "dayOfWeek", "startTime" ASC`, 
      [classLevel, section]
    );
    console.log('✅ Timetable query success. Count:', timetable.rows.length);

  } catch (e) {
    console.error('❌ Verification failed:', e.message);
  }
  process.exit(0);
}

verify();

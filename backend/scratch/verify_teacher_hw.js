import db from '../src/config/pool.js';
import { getHomeworkByTeacher } from '../src/features/homework/Homework.js';

async function verify() {
  const teacherId = 1; // Assuming teacher with ID 1 exists or has assignments
  console.log(`--- Verifying Teacher Homework Logic for teacherId ${teacherId} ---`);

  try {
    const homework = await getHomeworkByTeacher(db, teacherId);
    console.log('✅ Successfully fetched homework records:', homework.length);
    if (homework.length > 0) {
      console.log('Sample Homework:', JSON.stringify(homework[0], null, 2));
    }
  } catch (e) {
    console.error('❌ Verification failed:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

verify();

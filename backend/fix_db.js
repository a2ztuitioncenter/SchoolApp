import pool from './pool.js';

async function fixDB() {
  try {
    console.log('Removing duplicates...');
    await pool.query(`
      DELETE FROM attendance a
      USING attendance b
      WHERE a.id > b.id
        AND a."studentId" = b."studentId"
        AND a."attendanceDate" = b."attendanceDate";
    `);
    console.log('Duplicates removed.');

    console.log('Adding UNIQUE constraint...');
    await pool.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT attendance_studentId_attendanceDate_key 
      UNIQUE ("studentId", "attendanceDate");
    `);
    console.log('Constraint added.');
  } catch (err) {
    console.error('Error fixing DB:', err);
  } finally {
    await pool.end();
  }
}

fixDB();

import pool from '../src/config/pool.js';

async function verify() {
  try {
    console.log('--- Verifying getAllClasses() ---');
    const classesRes = await pool.query('SELECT DISTINCT "classLevel" AS class_level FROM students ORDER BY class_level');
    console.log('Classes:', classesRes.rows);
    
    if (classesRes.rows.length === 0) {
      console.log('WARNING: No classes found. Please ensure students exist in the database.');
    }

    console.log('\n--- Verifying getSectionsByClass() ---');
    if (classesRes.rows.length > 0) {
      const firstClass = classesRes.rows[0].class_level;
      const sectionsRes = await pool.query('SELECT DISTINCT section FROM students WHERE "classLevel" = $1 AND section IS NOT NULL ORDER BY section', [firstClass]);
      console.log(`Sections for class ${firstClass}:`, sectionsRes.rows.map(r => r.section));
    }

    console.log('\n--- Verifying attendance table schema ---');
    const attColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance'
    `);
    const cols = attColumns.rows.map(r => r.column_name);
    console.log('Attendance columns:', cols);
    
    const requiredCols = ['studentId', 'classLevel', 'isPresent'];
    requiredCols.forEach(col => {
      if (cols.includes(col)) {
        console.log(`✅ Column ${col} exists.`);
      } else {
        console.error(`❌ Column ${col} MISSING!`);
      }
    });

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await pool.end();
  }
}

verify();

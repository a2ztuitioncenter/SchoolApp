import pool from '../src/config/pool.js';

async function verify() {
  try {
    console.log('--- Verifying Syllabus Column Names ---');
    const colsRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'syllabus'
    `);
    const cols = colsRes.rows.map(r => r.column_name);
    console.log('Syllabus columns:', cols);
    
    // Note: The schema update I made uses quoted names ("classLevel").
    // In information_schema, these typically show up as classLevel (case preserved if quoted).
    if (cols.includes('classLevel')) {
        console.log('✅ Column "classLevel" found.');
    } else if (cols.includes('class_level')) {
        console.log('⚠️ Column "class_level" found. Schema update might not have been applied if table already exists.');
    }

    console.log('\n--- Verifying Student Fetch Logic ---');
    // Check if we can find any student and their classLevel
    const students = await pool.query('SELECT id, "userId", "classLevel", section FROM students LIMIT 1');
    if (students.rows.length > 0) {
        const student = students.rows[0];
        console.log('Found student:', student);
        
        console.log('\n--- Verifying Syllabus Query Logic ---');
        const classLvl = student.classLevel || '10';
        const sect = student.section || 'A';
        
        // Mock the query logic from studentRoutes.js
        const sylRes = await pool.query(
            `SELECT * FROM syllabus WHERE "classLevel" = $1 AND (section = $2 OR section = 'ALL' OR $2 = 'ALL')`,
            [classLvl, sect]
        );
        console.log(`Found ${sylRes.rows.length} syllabus items for ${classLvl}${sect}`);
    } else {
        console.log('No students found to test with.');
    }

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await pool.end();
  }
}

verify();

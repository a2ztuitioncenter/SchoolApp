import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'm:/WebDev/projects/tuition-app/backend/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSubjects() {
  try {
    const res = await pool.query('SELECT * FROM subjects WHERE "classLevel" = $1', ['10']);
    console.log('Subjects for Class 10:');
    console.log(JSON.stringify(res.rows, null, 2));
    
    // Test the specific query used by the API (simulated)
    const classLevel = '10';
    const section = 'A';
    const resFiltered = await pool.query(
        'SELECT * FROM subjects WHERE "classLevel" = $1 AND (section = $2 OR section = \'ALL\')',
        [classLevel, section]
    );
    console.log(`\nFiltered subjects for Class ${classLevel}, Section ${section}:`);
    console.log(JSON.stringify(resFiltered.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSubjects();

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'm:/WebDev/projects/tuition-app/backend/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function verifyQuery() {
  try {
    const query = `
      SELECT s.id, s."userId", s.name, s."classLevel", s.section, 
             s."fatherName", s."motherName", s.phone, s.email, 
             s."rollNumber", s."joiningDate", s."dateOfBirth", 
             s.status, s."schoolId", s."createdAt"
      FROM students s 
      ORDER BY s.name ASC
      LIMIT 1
    `;
    const res = await pool.query(query);
    console.log('Query result (first student):');
    console.log(JSON.stringify(res.rows[0], null, 2));
    console.log('SUCCESS: Student fetch query is working.');
  } catch (err) {
    console.error('FAILURE: Query failed:', err.message);
  } finally {
    await pool.end();
  }
}

verifyQuery();

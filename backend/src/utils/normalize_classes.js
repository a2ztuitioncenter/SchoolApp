import pool from '../config/pool.js';

async function normalize() {
  const tables = ['students', 'attendance', 'homework', 'syllabus', 'timetable', 'subject_assignments'];
  
  for (const table of tables) {
    console.log(`Auditing table: ${table}...`);
    try {
      // Find rows with combined class_level (e.g., '10A')
      // Postgres regex: ~ means matches regex. [0-9]+[A-Z] matches digits followed by uppercase letter.
      const res = await pool.query(`SELECT id, class_level, section FROM ${table} WHERE class_level ~ '^[0-9]+[A-Z]$';`);
      console.log(`Found ${res.rows.length} rows to normalize in ${table}.`);
      
      for (const row of res.rows) {
        const match = row.class_level.match(/^([0-9]+)([A-Z])$/);
        if (match) {
          const newClass = match[1];
          const newSection = match[2];
          console.log(`  Updating row ${row.id}: ${row.class_level} -> class: ${newClass}, section: ${newSection}`);
          
          // Use snake_case for column names
          await pool.query(
            `UPDATE ${table} SET class_level = $1, section = COALESCE(section, $2) WHERE id = $3`,
            [newClass, newSection, row.id]
          );
        }
      }
    } catch (err) {
      console.error(`Error processing table ${table}:`, err.message);
    }
  }
  
  await pool.end();
}

normalize();

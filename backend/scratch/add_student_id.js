import db from '../src/config/database.js';

async function migrate() {
  try {
    await db.query('ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS "studentId" INTEGER REFERENCES students(id) ON DELETE CASCADE');
    console.log('✅ Added studentId column to exam_results');
    
    // Attempt to backfill studentId based on rollNumber if it looks like an ID
    // We saw rollNumber can be '11'
    await db.query(`
      UPDATE exam_results er
      SET "studentId" = s.id
      FROM students s
      WHERE (er."rollNumber" = s.id::text OR er."studentName" = s.name)
      AND er."studentId" IS NULL
    `);
    console.log('✅ Backfilled studentId where possible');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
migrate();

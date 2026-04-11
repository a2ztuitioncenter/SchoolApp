/**
 * Migration Script: Migrate existing teachers to new schema
 * 
 * This script:
 * 1. Generates unique teacherId (T##### format) for existing teachers
 * 2. Assigns teachers to classes based on their timetable entries
 * 3. Updates the teacherId column in users table
 * 
 * Run this AFTER schema has been updated with teacherId column and teacher_class_assignment table
 * 
 * Usage: node migrate-teachers-to-new-schema.js
 */

import db from '../src/config/database.js';

const generateTeacherId = async (pool, role = 'teacher') => {
  const prefix = role === 'teacher' ? 'T' : role === 'staff' ? 'S' : 'T';
  let teacherId;
  let isUnique = false;
  
  while (!isUnique) {
    const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    teacherId = `${prefix}${randomDigits}`;
    
    const result = await pool.query('SELECT id FROM users WHERE "teacherId" = $1', [teacherId]);
    isUnique = result.rows.length === 0;
  }
  
  return teacherId;
};

async function migrateTeachers() {
  const pool = db;
  
  try {
    console.log('🔄 Starting teacher migration...\n');

    // 1. Get all teachers without teacherId
    console.log('📋 Fetching existing teachers without teacherId...');
    const teachersResult = await pool.query(
      `SELECT id, role FROM users WHERE role IN ('teacher', 'staff') AND "teacherId" IS NULL`
    );
    
    const teachers = teachersResult.rows;
    console.log(`✅ Found ${teachers.length} teachers to migrate\n`);

    if (teachers.length === 0) {
      console.log('ℹ️  No teachers to migrate. Migration complete.');
      process.exit(0);
    }

    let migratedCount = 0;
    let failedCount = 0;

    // 2. For each teacher, generate teacherId and assign classes
    for (const teacher of teachers) {
      try {
        // Generate unique teacherId
        const teacherId = await generateTeacherId(pool, teacher.role);
        console.log(`🔄 Migrating ${teacher.role} ID ${teacher.id}...`);

        // Get classes from timetable
        const classesResult = await pool.query(
          `SELECT DISTINCT "classLevel" FROM timetable WHERE "teacherId" = $1`,
          [teacher.id]
        );
        
        const classes = classesResult.rows.map(r => r.classLevel);
        console.log(`   Classes from timetable: ${classes.length > 0 ? classes.join(', ') : 'none'}`);

        // Update teacherId in users table
        await pool.query(
          `UPDATE users SET "teacherId" = $1 WHERE id = $2`,
          [teacherId, teacher.id]
        );
        console.log(`   ✅ TeacherId assigned: ${teacherId}`);

        // Assign to classes in teacher_class_assignment table
        if (classes.length > 0) {
          for (const classLevel of classes) {
            await pool.query(
              `INSERT INTO teacher_class_assignment ("teacherId", "classLevel", "schoolId")
               VALUES ($1, $2, $3)
               ON CONFLICT ("teacherId", "classLevel", section) DO NOTHING`,
              [teacher.id, classLevel, 'school-001']
            );
          }
          console.log(`   ✅ Assigned to ${classes.length} class(es)\n`);
        } else {
          console.log(`   ⚠️  No classes found in timetable\n`);
        }

        migratedCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating teacher ${teacher.id}:`, error.message);
        failedCount++;
      }
    }

    // 3. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${migratedCount}/${teachers.length}`);
    console.log(`❌ Failed: ${failedCount}/${teachers.length}`);
    
    if (failedCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Some migrations failed. Please review errors above.');
    }

    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateTeachers();

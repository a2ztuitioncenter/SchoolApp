import pool from './src/config/pool.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnose() {
  try {
    // Check if student with userId 22 exists
    const studentResult = await pool.query('SELECT * FROM students WHERE "userId" = $1', [22]);
    console.log('\n--- Student with userId 22 ---');
    if (studentResult.rows.length === 0) {
      console.log('❌ Student not found!');
    } else {
      const student = studentResult.rows[0];
      console.log('✓ Student found:', JSON.stringify(student, null, 2));
      
      // Check if class_level and section are not null
      if (!student.class_level || !student.section) {
        console.log('❌ class_level or section is null!');
      }
    }
    
    // Check homework table
    console.log('\n--- Homework table check ---');
    const homeworkTest = await pool.query('SELECT COUNT(*) FROM homework LIMIT 1');
    console.log('Homework table exists:', homeworkTest.rows[0]);
    
    // Check timetable table
    console.log('\n--- Timetable table check ---');
    const timetableTest = await pool.query(`SELECT * FROM timetable LIMIT 1`);
    console.log('Sample timetable row:', timetableTest.rows[0] || 'No rows');
    
    // Check notifications table
    console.log('\n--- Notifications table check ---');
    const notificationsTest = await pool.query(`SELECT * FROM notifications LIMIT 1`);
    console.log('Sample notification row:', notificationsTest.rows[0] || 'No rows');
    
    // Check exam_results table
    console.log('\n--- Exam results table check ---');
    const examResultTest = await pool.query(`SELECT * FROM exam_results LIMIT 1`);
    console.log('Sample exam result row:', examResultTest.rows[0] || 'No rows');
    
    // Try the actual queries from the endpoints
    if (studentResult.rows.length > 0) {
      const student = studentResult.rows[0];
      
      console.log('\n--- Testing dashboard queries ---');
      try {
        const timetableResult = await pool.query(
          `SELECT * FROM timetable 
           WHERE class_level = $1 AND (section = $2 OR section = 'ALL') 
           ORDER BY day_of_week, start_time ASC`, 
          [student.class_level, student.section]
        );
        console.log('✓ Timetable query succeeded, rows:', timetableResult.rows.length);
      } catch (e) {
        console.log('❌ Timetable query failed:', e.message);
      }
      
      try {
        const notificationsResult = await pool.query(
          `SELECT * FROM notifications 
           WHERE (class_level = $1 OR class_level IS NULL OR recipient_role = 'student')
           AND (section = $2 OR section IS NULL OR section = 'ALL')
           ORDER BY created_at DESC LIMIT 10`,
          [student.class_level, student.section]
        );
        console.log('✓ Notifications query succeeded, rows:', notificationsResult.rows.length);
      } catch (e) {
        console.log('❌ Notifications query failed:', e.message);
      }
    }
    
    await pool.end();
    console.log('\n✓ Diagnostic complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

diagnose();

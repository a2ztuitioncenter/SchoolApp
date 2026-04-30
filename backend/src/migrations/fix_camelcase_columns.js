import pool from '../config/pool.js';

async function migrate() {
    console.log('Starting migration: Standardizing camelCase column names...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Migrate teacher_class_assignment
        console.log('Migrating teacher_class_assignment...');
        const tcaColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'teacher_class_assignment' AND column_name = 'teacher_id'
        `);
        if (tcaColumns.rows.length > 0) {
            await client.query('ALTER TABLE teacher_class_assignment RENAME COLUMN teacher_id TO "teacherId"');
            await client.query('ALTER TABLE teacher_class_assignment RENAME COLUMN school_id TO "schoolId"');
            console.log('teacher_class_assignment migrated.');
        } else {
            console.log('teacher_class_assignment already migrated or column not found.');
        }

        // 2. Migrate timetable
        console.log('Migrating timetable...');
        const timetableColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'timetable' AND column_name = 'day_of_week'
        `);
        if (timetableColumns.rows.length > 0) {
            await client.query('ALTER TABLE timetable RENAME COLUMN day_of_week TO "dayOfWeek"');
            await client.query('ALTER TABLE timetable RENAME COLUMN start_time TO "startTime"');
            await client.query('ALTER TABLE timetable RENAME COLUMN end_time TO "endTime"');
            await client.query('ALTER TABLE timetable RENAME COLUMN class_level TO "classLevel"');
            await client.query('ALTER TABLE timetable RENAME COLUMN teacher_id TO "teacherId"');
            await client.query('ALTER TABLE timetable RENAME COLUMN school_id TO "schoolId"');
            console.log('timetable migrated.');
        } else {
            console.log('timetable already migrated or column not found.');
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();

import pool from '../src/config/pool.js';

async function migrate() {
    console.log('Starting migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Migrate Timetable
        console.log('Migrating timetable table...');
        const ttCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'timetable'");
        const ttColNames = ttCols.rows.map(r => r.column_name);

        if (ttColNames.includes('dayOfWeek')) {
            await client.query('ALTER TABLE timetable RENAME COLUMN "dayOfWeek" TO day_of_week');
            await client.query('ALTER TABLE timetable RENAME COLUMN "startTime" TO start_time');
            await client.query('ALTER TABLE timetable RENAME COLUMN "endTime" TO end_time');
            await client.query('ALTER TABLE timetable RENAME COLUMN "classLevel" TO class_level');
            await client.query('ALTER TABLE timetable RENAME COLUMN "teacherId" TO teacher_id');
            await client.query('ALTER TABLE timetable RENAME COLUMN "schoolId" TO school_id');
        }

        const ttColsAfter = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'timetable'");
        const ttNamesAfter = ttColsAfter.rows.map(r => r.column_name);

        if (!ttNamesAfter.includes('subject_id')) {
            await client.query('ALTER TABLE timetable ADD COLUMN subject_id UUID REFERENCES subjects(id)');
            if (ttNamesAfter.includes('subject')) {
                await client.query(`
                    UPDATE timetable t
                    SET subject_id = s.id
                    FROM subjects s
                    WHERE t.subject = s.name
                `);
                await client.query('ALTER TABLE timetable DROP COLUMN subject');
            }
        }

        // 2. Migrate Homework
        console.log('Migrating homework table...');
        const hwCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'homework'");
        const hwColNames = hwCols.rows.map(r => r.column_name);

        if (hwColNames.includes('classLevel')) {
            await client.query('ALTER TABLE homework RENAME COLUMN "classLevel" TO class_level');
            await client.query('ALTER TABLE homework RENAME COLUMN "dueDate" TO due_date');
            await client.query('ALTER TABLE homework RENAME COLUMN "teacherId" TO teacher_id');
            await client.query('ALTER TABLE homework RENAME COLUMN "attachmentUrl" TO attachment_url');
            await client.query('ALTER TABLE homework RENAME COLUMN "schoolId" TO school_id');
        }

        const hwColsAfter = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'homework'");
        const hwNamesAfter = hwColsAfter.rows.map(r => r.column_name);

        if (!hwNamesAfter.includes('subject_id')) {
            await client.query('ALTER TABLE homework ADD COLUMN subject_id UUID REFERENCES subjects(id)');
            if (hwNamesAfter.includes('subject')) {
                await client.query(`
                    UPDATE homework h
                    SET subject_id = s.id
                    FROM subjects s
                    WHERE h.subject = s.name
                `);
                await client.query('ALTER TABLE homework DROP COLUMN subject');
            }
        }

        // 3. Migrate Study Materials
        console.log('Migrating study_materials table...');
        const matCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'study_materials'");
        const matColNames = matCols.rows.map(r => r.column_name);

        if (!matColNames.includes('subject_id')) {
            await client.query('ALTER TABLE study_materials ADD COLUMN subject_id UUID REFERENCES subjects(id)');
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

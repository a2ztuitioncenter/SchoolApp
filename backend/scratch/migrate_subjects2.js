import pool from '../src/config/pool.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('1. Dropping existing un-normalized subjects...');
        await client.query('DROP TABLE IF EXISTS subjects CASCADE;');
        await client.query('DROP TABLE IF EXISTS subject_assignments CASCADE;');

        console.log('2. Creating new normalized tables...');
        // uuid-ossp or gen_random_uuid() is standard in recent Postgres.
        await client.query(`
            CREATE TABLE subjects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                code VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE subject_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
                class_level VARCHAR(50) NOT NULL,
                section VARCHAR(10),
                assigned_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject_id, class_level, section)
            );
        `);

        console.log('3. Updating dependent tables...');
        // Skipping results because it might not exist yet, or was already rebuilt.
        const tablesToUpdate = ['homework', 'timetable', 'materials'];
        
        for (const table of tablesToUpdate) {
            console.log(`Updating ${table}...`);
            try {
                await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS subject;`);
                await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS subject_id;`);
                await client.query(`ALTER TABLE ${table} ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;`);
                console.log(`Updated ${table}`);
            } catch (e) {
                console.log(`Skipping ${table}: ${e.message}`);
            }
        }

        console.log('✅ Migration successful! (some skipped)');
    } catch (err) {
        console.error('❌ Migration script threw:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();

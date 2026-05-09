import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const targetSubjects = [
    { name: 'Assamese', code: 'ASS' },
    { name: 'English', code: 'ENG' },
    { name: 'English Grammar', code: 'EGR' },
    { name: 'Mathematics', code: 'MAT' },
    { name: 'Science', code: 'SCI' },
    { name: 'Social Science', code: 'SSC' },
    { name: 'Hindi', code: 'HIN' },
    { name: 'Computer', code: 'COM' }
];

async function syncSubjects() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting subject synchronization...');
        await client.query('BEGIN');

        // 1. Fetch current subjects
        const currentRes = await client.query('SELECT * FROM subjects');
        const currentSubjects = currentRes.rows;
        console.log(`Current subjects count: ${currentSubjects.length}`);

        // 2. Identify subjects to remove
        const targetNames = targetSubjects.map(s => s.name.toLowerCase());
        const toRemove = currentSubjects.filter(s => !targetNames.includes(s.name.toLowerCase()));

        if (toRemove.length > 0) {
            const removeIds = toRemove.map(s => s.id);
            console.log(`Removing ${toRemove.length} subjects: ${toRemove.map(s => s.name).join(', ')}`);

            // Delete associated assignments and timetable entries
            await client.query('DELETE FROM subject_assignments WHERE subject_id = ANY($1)', [removeIds]);
            await client.query('DELETE FROM timetable WHERE subject_id = ANY($1)', [removeIds]);
            
            // Delete the subjects themselves
            await client.query('DELETE FROM subjects WHERE id = ANY($1)', [removeIds]);
        } else {
            console.log('No subjects to remove.');
        }

        // 3. Add or update target subjects
        for (const sub of targetSubjects) {
            const matches = currentSubjects.filter(s => s.name.toLowerCase() === sub.name.toLowerCase());
            
            if (matches.length === 0) {
                console.log(`Adding subject: ${sub.name}`);
                await client.query(
                    'INSERT INTO subjects (name, code) VALUES ($1, $2)',
                    [sub.name, sub.code]
                );
            } else {
                // Keep the first one, delete others
                const [keep, ...others] = matches;
                console.log(`Ensuring single entry for ${sub.name}. Keeping ID ${keep.id}.`);
                
                if (others.length > 0) {
                    const otherIds = others.map(o => o.id);
                    console.log(`Deleting ${others.length} duplicate(s) of ${sub.name}.`);
                    await client.query('DELETE FROM subject_assignments WHERE subject_id = ANY($1)', [otherIds]);
                    await client.query('DELETE FROM timetable WHERE subject_id = ANY($1)', [otherIds]);
                    await client.query('DELETE FROM subjects WHERE id = ANY($1)', [otherIds]);
                }

                // Update name and code to match target exactly
                if (keep.name !== sub.name || keep.code !== sub.code) {
                    console.log(`Updating ${keep.name} (${keep.code}) -> ${sub.name} (${sub.code})`);
                    await client.query(
                        'UPDATE subjects SET name = $1, code = $2 WHERE id = $3',
                        [sub.name, sub.code, keep.id]
                    );
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Subject synchronization completed successfully!');

        // Final check
        const finalRes = await client.query('SELECT name, code FROM subjects ORDER BY name ASC');
        console.log('\nFinal Subject List:');
        console.table(finalRes.rows);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during synchronization:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

syncSubjects();

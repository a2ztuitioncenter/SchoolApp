import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        await pool.query('ALTER TABLE timetable ADD COLUMN IF NOT EXISTS section VARCHAR(20);');
        console.log('Added section to timetable');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();

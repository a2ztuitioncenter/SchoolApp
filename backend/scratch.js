import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        await pool.query("UPDATE timetable SET section = 'A' WHERE section IS NULL OR section = '';");
        await pool.query('ALTER TABLE timetable ALTER COLUMN section SET NOT NULL;');
        console.log('Altered table constraint!');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();

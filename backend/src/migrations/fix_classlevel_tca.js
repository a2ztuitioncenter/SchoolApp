import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Migrating class_level in teacher_class_assignment...');
        
        await client.query('BEGIN');

        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'teacher_class_assignment' AND column_name = 'class_level'
        `);

        if (checkColumn.rows.length > 0) {
            await client.query('ALTER TABLE teacher_class_assignment RENAME COLUMN class_level TO "classLevel"');
            console.log('✅ teacher_class_assignment.class_level migrated to "classLevel".');
        } else {
            console.log('ℹ️ teacher_class_assignment.class_level already migrated or not found.');
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
function sanitizeIdentifier(id) {
  return id.replace(/[^a-z0-9_]/gi, '');
}

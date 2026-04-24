import db from './backend/src/config/pool.js';

async function fix() {
    try {
        console.log('Altering marks column to VARCHAR...');
        await db.query(`ALTER TABLE submissions ALTER COLUMN marks TYPE VARCHAR(50);`);
        console.log('✅ Column altered successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Alter failed:', err);
        process.exit(1);
    }
}

fix();

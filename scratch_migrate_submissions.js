import db from './backend/src/config/pool.js';

async function migrate() {
    try {
        console.log('Starting migration...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                homework_id INTEGER REFERENCES homework(id) ON DELETE CASCADE,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                file_url TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'submitted',
                remark_text TEXT,
                marks VARCHAR(50),
                reviewed_by INTEGER REFERENCES users(id),
                submitted_at TIMESTAMP DEFAULT NOW(),
                reviewed_at TIMESTAMP,
                UNIQUE(homework_id, student_id)
            );
        `);
        console.log('✅ Submissions table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();

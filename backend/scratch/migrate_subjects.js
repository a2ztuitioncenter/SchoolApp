import pool from '../src/config/pool.js';

async function migrate() {
    try {
        console.log('🚀 Starting subjects table migration...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                "classLevel" VARCHAR(20) NOT NULL,
                section VARCHAR(10), 
                "teacherId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
                "schoolId" VARCHAR(50) DEFAULT 'school-001',
                "createdAt" TIMESTAMP DEFAULT NOW(),
                UNIQUE(name, "classLevel", section)
            );
        `);
        
        console.log('✅ Subjects table created successfully or already exists.');
        
        // Optional: Pre-populate common subjects for Class 10 (as a starter)
        const demoSubjects = [
            ['Mathematics', '10', 'ALL'],
            ['Physics', '10', 'ALL'],
            ['Chemistry', '10', 'ALL'],
            ['Biology', '10', 'ALL'],
            ['English', '10', 'ALL'],
            ['Hindi', '10', 'ALL']
        ];
        
        for (const [name, level, sec] of demoSubjects) {
            await pool.query(
                'INSERT INTO subjects (name, "classLevel", section) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [name, level, sec]
            );
        }
        
        console.log('✅ Demo subjects populated.');
        
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();

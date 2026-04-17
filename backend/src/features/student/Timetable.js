
export const timetableModel = {
    schema: `
    CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        day_of_week VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        subject VARCHAR(100) NOT NULL,
        class_level VARCHAR(50) NOT NULL,
        section VARCHAR(20) NOT NULL,
        teacher_id INTEGER REFERENCES users(id),
        school_id VARCHAR(50) DEFAULT 'school-001',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `
};

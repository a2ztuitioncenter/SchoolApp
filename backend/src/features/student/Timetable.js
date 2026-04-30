
export const timetableModel = {
    schema: `
    CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        day_of_week VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        subject_id UUID REFERENCES subjects(id),
        class_level VARCHAR(50) NOT NULL,
        section VARCHAR(20) NOT NULL,
        teacher_id INTEGER REFERENCES users(id),
        school_id VARCHAR(50) REFERENCES schools(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    );
    `
};

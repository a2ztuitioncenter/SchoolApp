
export const notificationModel = {
    schema: `
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        recipient_role VARCHAR(50),
        class_level VARCHAR(50),
        section VARCHAR(10) DEFAULT 'A',
        created_by INTEGER REFERENCES users(id),
        school_id VARCHAR(50) DEFAULT 'school-001',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `
};


export const notificationModel = {
    schema: `
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        "attachmentUrl" TEXT,
        "recipientRole" VARCHAR(50),
        "classLevel" VARCHAR(50),
        "createdBy" INTEGER REFERENCES users(id),
        "schoolId" VARCHAR(50) DEFAULT 'school-001',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `
};

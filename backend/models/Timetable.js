
export const timetableModel = {
    schema: `
    CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        "dayOfWeek" VARCHAR(20) NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        subject VARCHAR(100) NOT NULL,
        "classLevel" VARCHAR(50) NOT NULL,
        "teacherId" INTEGER REFERENCES users(id),
        "schoolId" VARCHAR(50) DEFAULT 'school-001',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `
};

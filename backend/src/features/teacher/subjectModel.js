import pool from '../../config/pool.js';

export const subjectModel = {
    async create({ name, classLevel, section, teacherId, schoolId = 'school-001' }, db = pool) {
        const query = `
            INSERT INTO subjects (name, "classLevel", section, "teacherId", "schoolId")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [name, classLevel, section || 'ALL', teacherId, schoolId];
        const res = await db.query(query, values);
        return res.rows[0];
    },

    async getAll({ classLevel, section, schoolId = 'school-001' }, db = pool) {
        let query = 'SELECT * FROM subjects WHERE "schoolId" = $1';
        const values = [schoolId];
        let placeholderCount = 2;

        if (classLevel) {
            query += ` AND "classLevel" = $${placeholderCount++}`;
            values.push(classLevel);
        }

        if (section && section !== 'ALL') {
            query += ` AND (section = $${placeholderCount++} OR section = 'ALL')`;
            values.push(section);
        }

        query += ' ORDER BY name ASC';
        const res = await db.query(query, values);
        return res.rows;
    },

    async delete(id, db = pool) {
        const query = 'DELETE FROM subjects WHERE id = $1 RETURNING *';
        const res = await db.query(query, [id]);
        return res.rows[0];
    },

    async checkPermission(teacherId, classLevel, db = pool) {
        const query = `
            SELECT 1 FROM teacher_class_assignment 
            WHERE "teacherId" = $1 AND "classLevel" = $2
            LIMIT 1
        `;
        const res = await db.query(query, [teacherId, classLevel]);
        return res.rows.length > 0;
    }
};

import pool from '../../config/pool.js';

export const subjectModel = {
    // 1. Create a Master Subject (Admin Only)
    async createMaster({ name, code }, db = pool) {
        const query = `
            INSERT INTO subjects (name, code)
            VALUES ($1, $2)
            RETURNING *
        `;
        const values = [name, code];
        const res = await db.query(query, values);
        return res.rows[0];
    },

    // 2. Assign Subject to a Class/Section
    async assignSubject({ subject_id, class_level, section, assigned_by }, db = pool) {
        const query = `
            INSERT INTO subject_assignments (subject_id, class_level, section, assigned_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [subject_id, class_level, section || null, assigned_by];
        const res = await db.query(query, values);
        return res.rows[0];
    },

    // 3. Get Subjects (Filtered by Class/Section or all if admin)
    async getSubjects({ class_level, section }, db = pool) {
        // Build base query parsing assignments
        let query = `
            SELECT s.id, s.name, s.code, sa.class_level, sa.section, sa.id as assignment_id
            FROM subjects s
            LEFT JOIN subject_assignments sa ON s.id = sa.subject_id
        `;
        
        const conditions = [];
        const values = [];
        let placeholderCount = 1;

        if (class_level) {
            conditions.push(`sa.class_level = $${placeholderCount++}`);
            values.push(class_level);
        }

        if (section && section !== 'ALL') {
            conditions.push(`(sa.section = $${placeholderCount++} OR sa.section IS NULL)`);
            values.push(section);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY s.name ASC, sa.class_level ASC, sa.section ASC';
        
        const res = await db.query(query, values);
        return res.rows;
    },

    // 4. Get Master Subjects only (for Admin dropdown or management)
    async getMasterSubjects(db = pool) {
        const query = 'SELECT * FROM subjects ORDER BY name ASC';
        const res = await db.query(query);
        return res.rows;
    },

    // 5. Delete Master Subject
    async deleteMaster(id, db = pool) {
        const query = 'DELETE FROM subjects WHERE id = $1 RETURNING *';
        const res = await db.query(query, [id]);
        return res.rows[0];
    },

    // 6. Delete Assignment
    async deleteAssignment(assignment_id, db = pool) {
        const query = 'DELETE FROM subject_assignments WHERE id = $1 RETURNING *';
        const res = await db.query(query, [assignment_id]);
        return res.rows[0];
    },

    // Check teacher permission (already correctly mapped class level logic)
    async checkTeacherPermission(teacher_id, class_level, db = pool) {
        const query = `
            SELECT 1 FROM teacher_class_assignment 
            WHERE "teacherId" = $1 AND "classLevel" = $2
            LIMIT 1
        `;
        const res = await db.query(query, [teacher_id, class_level]);
        return res.rows.length > 0;
    }
};

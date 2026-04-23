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

    // 2. Assign Subject to a Class/Section/Teacher
    async assignSubject({ subject_id, class_level, section, teacher_id, assigned_by }, db = pool) {
        const query = `
            INSERT INTO subject_assignments (subject_id, class_level, section, teacher_id, assigned_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [subject_id, class_level, section || 'ALL', teacher_id, assigned_by];
        const res = await db.query(query, values);
        return res.rows[0];
    },

    // 3. Get Subjects (Filtered by Class/Section/Teacher)
    async getSubjects({ class_level, section, teacher_id }, db = pool) {
        let query = `
            SELECT sa.id, s.id as subject_id, s.name, s.name as master_name, s.code, 
                   sa.class_level, sa.section,
                   sa.teacher_id, u.name as teacher_name
            FROM subjects s
            JOIN subject_assignments sa ON s.id = sa.subject_id
            LEFT JOIN users u ON sa.teacher_id = u.id
        `;
        
        const conditions = [];
        const values = [];
        let placeholderCount = 1;

        if (class_level) {
            conditions.push(`sa.class_level = $${placeholderCount++}`);
            values.push(class_level);
        }

        if (section && section !== 'ALL') {
            conditions.push(`(sa.section = $${placeholderCount++} OR sa.section = 'ALL')`);
            values.push(section);
        }

        if (teacher_id) {
            conditions.push(`sa.teacher_id = $${placeholderCount++}`);
            values.push(teacher_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY s.name ASC, sa.class_level ASC, sa.section ASC';
        
        const res = await db.query(query, values);
        return res.rows;
    },

    // 4. Get subjects specifically for a teacher
    async getTeacherSubjects(teacher_id, db = pool) {
        const query = `
            SELECT s.name, s.name as master_name, s.name as subject_name, 
                   s.code, s.code as subject_code, 
                   sa.class_level, sa.section, sa.id as assignment_id,
                   sa.created_at
            FROM subjects s
            JOIN subject_assignments sa ON s.id = sa.subject_id
            WHERE sa.teacher_id = $1
            ORDER BY sa.class_level ASC, sa.section ASC
        `;
        const res = await db.query(query, [teacher_id]);
        return res.rows;
    },

    // 5. Get Master Subjects only
    async getMasterSubjects(db = pool) {
        const query = 'SELECT *, id as subject_id, name as master_name FROM subjects ORDER BY name ASC';
        const res = await db.query(query);
        return res.rows;
    },

    // 6. Delete Master Subject
    async deleteMaster(id, db = pool) {
        const query = 'DELETE FROM subjects WHERE id = $1 RETURNING *';
        const res = await db.query(query, [id]);
        return res.rows[0];
    },

    // 7. Delete Assignment
    async deleteAssignment(assignment_id, db = pool) {
        const query = 'DELETE FROM subject_assignments WHERE id = $1 RETURNING *';
        const res = await db.query(query, [assignment_id]);
        return res.rows[0];
    },

    // 8. Check teacher permission (using both tables for safety)
    async checkTeacherPermission(teacher_id, class_level, db = pool) {
        const query = `
            SELECT 1 FROM (
                SELECT teacher_id, class_level FROM teacher_class_assignment
                UNION
                SELECT teacher_id, class_level FROM subject_assignments
            ) AS combined_assignments
            WHERE teacher_id = $1 AND class_level = $2
            LIMIT 1
        `;
        const res = await db.query(query, [teacher_id, class_level]);
        return res.rows.length > 0;
    }
};

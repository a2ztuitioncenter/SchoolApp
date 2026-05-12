import db from '../../config/pool.js';

export const submissionModel = {
    async createOrUpdate({ homeworkId, studentId, fileUrl }) {
        // Normalize file URL: ensure it starts with / but not /api/
        const normalizedFileUrl = fileUrl ? fileUrl.replace(/^\/api/, '') : null;

        const query = `
            INSERT INTO submissions (homework_id, student_id, file_url, status, submitted_at)
            VALUES ($1, $2, $3, 'submitted', NOW())
            ON CONFLICT (homework_id, student_id)
            DO UPDATE SET 
                file_url = EXCLUDED.file_url,
                status = 'submitted',
                submitted_at = NOW(),
                remark_text = NULL,
                marks = NULL,
                reviewed_by = NULL,
                reviewed_at = NULL
            RETURNING *
        `;
        const result = await db.query(query, [homeworkId, studentId, normalizedFileUrl]);
        return result.rows[0];
    },

    async getStudentSubmission(homeworkId, studentId) {
        const query = `
            SELECT s.*, u.name as reviewer_name
            FROM submissions s
            LEFT JOIN users u ON s.reviewed_by = u.id
            WHERE s.homework_id = $1 AND s.student_id = $2
        `;
        const result = await db.query(query, [homeworkId, studentId]);
        return result.rows[0];
    },

    async getAllStudentSubmissions(studentId) {
        const query = `
            SELECT s.*, h.title as homework_title, h.subject, u.name as reviewer_name
            FROM submissions s
            JOIN homework h ON s.homework_id = h.id
            LEFT JOIN users u ON s.reviewed_by = u.id
            WHERE s.student_id = $1
            ORDER BY s.submitted_at DESC
        `;
        const result = await db.query(query, [studentId]);
        return result.rows;
    },

    async getHomeworkSubmissions(homeworkId) {
        const query = `
            SELECT s.*, st.name as student_name, st.roll_number, u.name as reviewer_name
            FROM submissions s
            JOIN students st ON s.student_id = st.id
            LEFT JOIN users u ON s.reviewed_by = u.id
            WHERE s.homework_id = $1
            ORDER BY st.name ASC
        `;
        const result = await db.query(query, [homeworkId]);
        return result.rows;
    },

    async getTeacherSubmissions(teacherId) {
        const query = `
            SELECT s.*, st.name as student_name, st.roll_number, h.title as homework_title, h.class_level, h.section, u.name as reviewer_name
            FROM submissions s
            JOIN students st ON s.student_id = st.id
            JOIN homework h ON s.homework_id = h.id
            LEFT JOIN users u ON s.reviewed_by = u.id
            WHERE h.teacher_id = $1 OR EXISTS (
                SELECT 1 FROM subject_assignments sa 
                WHERE sa.teacher_id = $1 
                AND sa.class_level = h.class_level 
                AND (sa.section = h.section OR sa.section = 'ALL')
                AND sa.subject_id = h.subject_id
            )
            ORDER BY s.submitted_at DESC
        `;
        const result = await db.query(query, [teacherId]);
        return result.rows;
    },

    async review({ submissionId, remarkText, marks, reviewedBy }) {
        const query = `
            UPDATE submissions
            SET 
                remark_text = $1,
                marks = $2,
                reviewed_by = $3,
                status = 'reviewed',
                reviewed_at = NOW()
            WHERE id = $4
            RETURNING *
        `;
        const result = await db.query(query, [remarkText, marks, reviewedBy, submissionId]);
        return result.rows[0];
    },

    async getById(id) {
        const query = `
            SELECT s.*, h.class_level, h.section, h.teacher_id
            FROM submissions s
            JOIN homework h ON s.homework_id = h.id
            WHERE s.id = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }
};

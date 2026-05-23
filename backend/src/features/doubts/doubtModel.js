import db from '../../config/pool.js';

export const doubtModel = {
  table: 'doubts',
  schema: `
    CREATE TABLE IF NOT EXISTS doubts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        attachment_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
        solution_text TEXT,
        solution_attachment_url VARCHAR(500),
        answered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_doubts_student_id ON doubts(student_id);
    CREATE INDEX IF NOT EXISTS idx_doubts_teacher_id ON doubts(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_doubts_status ON doubts(status);
  `,

  formatRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentRollNumber: row.student_roll_number || row.roll_number,
      studentClassLevel: row.student_class_level || row.class_level,
      studentSection: row.student_section || row.section,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      subjectId: row.subject_id,
      subjectName: row.subject_name || row.subject,
      title: row.title,
      description: row.description,
      attachmentUrl: row.attachment_url,
      status: row.status,
      solutionText: row.solution_text,
      solutionAttachmentUrl: row.solution_attachment_url,
      answeredAt: row.answered_at,
      createdAt: row.created_at
    };
  },

  async create({ studentId, teacherId, subjectId, title, description, attachmentUrl }, pool = db) {
    const normalizedUrl = attachmentUrl ? attachmentUrl.replace(/^\/api/, '') : null;
    const query = `
      INSERT INTO doubts (student_id, teacher_id, subject_id, title, description, attachment_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await pool.query(query, [studentId, teacherId, subjectId, title, description, normalizedUrl]);
    return this.formatRow(res.rows[0]);
  },

  async getStudentDoubts(studentId, pool = db) {
    const query = `
      SELECT d.*, 
             u.name AS teacher_name, 
             s.name AS subject_name
      FROM doubts d
      LEFT JOIN users u ON d.teacher_id = u.id
      LEFT JOIN subjects s ON d.subject_id = s.id
      WHERE d.student_id = $1
      ORDER BY d.created_at DESC
    `;
    const res = await pool.query(query, [studentId]);
    return res.rows.map(row => this.formatRow(row));
  },

  async getTeacherDoubts(teacherId, pool = db) {
    const query = `
      SELECT d.*, 
             st.name AS student_name, 
             st.roll_number AS student_roll_number,
             st.class_level AS student_class_level,
             st.section AS student_section,
             s.name AS subject_name
      FROM doubts d
      LEFT JOIN students st ON d.student_id = st.id
      LEFT JOIN subjects s ON d.subject_id = s.id
      WHERE d.teacher_id = $1
      ORDER BY d.created_at DESC
    `;
    const res = await pool.query(query, [teacherId]);
    return res.rows.map(row => this.formatRow(row));
  },

  async getById(id, pool = db) {
    const query = `
      SELECT d.*, 
             st.name AS student_name, 
             st.roll_number AS student_roll_number,
             st.class_level AS student_class_level,
             st.section AS student_section,
             u.name AS teacher_name, 
             s.name AS subject_name
      FROM doubts d
      LEFT JOIN students st ON d.student_id = st.id
      LEFT JOIN users u ON d.teacher_id = u.id
      LEFT JOIN subjects s ON d.subject_id = s.id
      WHERE d.id = $1
    `;
    const res = await pool.query(query, [id]);
    return this.formatRow(res.rows[0]);
  },

  async answerDoubt(id, { solutionText, solutionAttachmentUrl }, pool = db) {
    const normalizedUrl = solutionAttachmentUrl ? solutionAttachmentUrl.replace(/^\/api/, '') : null;
    const query = `
      UPDATE doubts 
      SET solution_text = $1, 
          solution_attachment_url = $2, 
          status = 'answered', 
          answered_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const res = await pool.query(query, [solutionText, normalizedUrl, id]);
    return this.formatRow(res.rows[0]);
  }
};

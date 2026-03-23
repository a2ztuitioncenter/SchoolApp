// Homework.js - Homework model for tracking teacher-assigned homework
export const homeworkModel = {
  table: 'homework',
  schema: `
    CREATE TABLE IF NOT EXISTS homework (
      id SERIAL PRIMARY KEY,
      "teacherId" INT NOT NULL,
      "classLevel" VARCHAR(10) NOT NULL,
      section VARCHAR(5),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      "dueDate" DATE,
      subject VARCHAR(50),
      "attachmentUrl" VARCHAR(500),
      "schoolId" VARCHAR(50) NOT NULL DEFAULT 'school-001',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("teacherId") REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_homework_teacherId ON homework("teacherId");
    CREATE INDEX IF NOT EXISTS idx_homework_classLevel ON homework("classLevel");
    CREATE INDEX IF NOT EXISTS idx_homework_dueDate ON homework("dueDate");
    CREATE INDEX IF NOT EXISTS idx_homework_schoolId ON homework("schoolId");
  `,
};

// Helper to get homework by ID
export const getHomeworkById = async (pool, id) => {
  try {
    const result = await pool.query(
      'SELECT * FROM homework WHERE id = $1 LIMIT 1',
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching homework by ID:', error);
    throw error;
  }
};

// Helper to get all homework for a specific class
export const getHomeworkByClass = async (pool, classLevel, section = null) => {
  try {
    let query = 'SELECT h.*, u.phone as teacherPhone FROM homework h JOIN users u ON h."teacherId" = u.id WHERE h."classLevel" = $1';
    const params = [classLevel];

    if (section) {
      query += ' AND h.section = $2';
      params.push(section);
    }

    query += ' ORDER BY h."dueDate" DESC';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching homework by class:', error);
    throw error;
  }
};

// Helper to get all homework assigned by a teacher
export const getHomeworkByTeacher = async (pool, teacherId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM homework WHERE "teacherId" = $1 ORDER BY "dueDate" DESC',
      [teacherId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching homework by teacher:', error);
    throw error;
  }
};

// Helper to create a homework record
export const createHomework = async (pool, homeworkData) => {
  const {
    teacherId,
    classLevel,
    section,
    title,
    description,
    dueDate,
    subject,
    attachmentUrl,
    schoolId = 'school-001',
  } = homeworkData;

  try {
    const result = await pool.query(
      `INSERT INTO homework 
       ("teacherId", "classLevel", section, title, description, "dueDate", subject, "attachmentUrl", "schoolId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [teacherId, classLevel, section, title, description, dueDate, subject, attachmentUrl, schoolId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating homework:', error);
    throw error;
  }
};

// Helper to update homework
export const updateHomework = async (pool, id, homeworkData) => {
  const {
    title,
    description,
    dueDate,
    subject,
    attachmentUrl,
  } = homeworkData;

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramCount}`);
    values.push(title);
    paramCount++;
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount}`);
    values.push(description);
    paramCount++;
  }
  if (dueDate !== undefined) {
    updates.push(`"dueDate" = $${paramCount}`);
    values.push(dueDate);
    paramCount++;
  }
  if (subject !== undefined) {
    updates.push(`subject = $${paramCount}`);
    values.push(subject);
    paramCount++;
  }
  if (attachmentUrl !== undefined) {
    updates.push(`"attachmentUrl" = $${paramCount}`);
    values.push(attachmentUrl);
    paramCount++;
  }

  if (updates.length === 0) return null;

  updates.push('"updatedAt" = CURRENT_TIMESTAMP');
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE homework SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error updating homework:', error);
    throw error;
  }
};

// Helper to delete homework
export const deleteHomework = async (pool, id) => {
  try {
    const result = await pool.query(
      'DELETE FROM homework WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting homework:', error);
    throw error;
  }
};

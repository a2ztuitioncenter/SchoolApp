import express from 'express';
import {
  getHomeworkByTeacher,
  createHomework,
  updateHomework,
  deleteHomework,
  getHomeworkByClass,
} from '../homework/Homework.js';
import { getUserById } from '../auth/User.js';
import { getStudentByUserId } from '../student/Student.js';

const router = express.Router();

// Get teacher's dashboard info
router.get('/dashboard/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const pool = req.db;

    // Get teacher info
    const teacher = await getUserById(pool, teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ error: 'Unauthorized: Not a teacher' });
    }

    // Get all homework by this teacher
    const homework = await getHomeworkByTeacher(pool, teacherId);
    
    // Get unique classes taught by this teacher
    const classesResult = await pool.query(
      'SELECT DISTINCT classLevel, section FROM homework WHERE teacherId = $1 ORDER BY classLevel',
      [teacherId]
    );

    // Get total students in all classes
    const studentsResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) as totalStudents
       FROM students s
       WHERE s.classLevel IN (
         SELECT DISTINCT classLevel FROM homework WHERE teacherId = $1
       )`,
      [teacherId]
    );

    res.json({
      success: true,
      teacher: {
        id: teacher.id,
        phone: teacher.phone,
        role: teacher.role,
      },
      stats: {
        totalHomework: homework.length,
        totalClasses: classesResult.rows.length,
        totalStudents: parseInt(studentsResult.rows[0].totalStudents || 0),
      },
      classes: classesResult.rows,
      homework: homework,
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get homework for a specific class
router.get('/class/:classLevel', async (req, res) => {
  try {
    const { classLevel } = req.params;
    const { section } = req.query;
    const pool = req.db;

    const homework = await getHomeworkByClass(pool, classLevel, section || null);

    res.json({
      success: true,
      homework: homework,
    });
  } catch (error) {
    console.error('Error fetching class homework:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// Add new homework (only for teachers)
router.post('/homework/add', async (req, res) => {
  try {
    const {
      teacherId,
      classLevel,
      section,
      title,
      description,
      dueDate,
      subject,
      attachmentUrl,
    } = req.body;

    const pool = req.db;

    // Verify teacher
    const teacher = await getUserById(pool, teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ error: 'Unauthorized: Not a teacher' });
    }

    // Validate required fields
    if (!classLevel || !title || !dueDate) {
      return res.status(400).json({
        error: 'Missing required fields: classLevel, title, dueDate',
      });
    }

    // Create homework
    const homework = await createHomework(pool, {
      teacherId,
      classLevel,
      section,
      title,
      description,
      dueDate,
      subject,
      attachmentUrl,
    });

    res.json({
      success: true,
      message: 'Homework created successfully',
      homework: homework,
    });
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// Update homework (only owner or admin)
router.put('/homework/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, title, description, dueDate, subject, attachmentUrl } = req.body;
    const pool = req.db;

    // Verify teacher
    const teacher = await getUserById(pool, teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ error: 'Unauthorized: Not a teacher' });
    }

    // Check homework ownership
    const homework = await pool.query(
      'SELECT teacherId FROM homework WHERE id = $1',
      [id]
    );

    if (homework.rows.length === 0) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    if (homework.rows[0].teacherid !== parseInt(teacherId)) {
      return res.status(403).json({ error: 'Unauthorized: Cannot update homework' });
    }

    // Update homework
    const updated = await updateHomework(pool, id, {
      title,
      description,
      dueDate,
      subject,
      attachmentUrl,
    });

    res.json({
      success: true,
      message: 'Homework updated successfully',
      homework: updated,
    });
  } catch (error) {
    console.error('Error updating homework:', error);
    res.status(500).json({ error: 'Failed to update homework' });
  }
});

// Delete homework (only owner or admin)
router.delete('/homework/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const pool = req.db;

    // Verify teacher
    const teacher = await getUserById(pool, teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ error: 'Unauthorized: Not a teacher' });
    }

    // Check homework ownership
    const homework = await pool.query(
      'SELECT teacherId FROM homework WHERE id = $1',
      [id]
    );

    if (homework.rows.length === 0) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    if (homework.rows[0].teacherid !== parseInt(teacherId)) {
      return res.status(403).json({ error: 'Unauthorized: Cannot delete homework' });
    }

    // Delete homework
    await deleteHomework(pool, id);

    res.json({
      success: true,
      message: 'Homework deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting homework:', error);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

// Get students in a specific class (for teacher reference)
router.get('/students/:classLevel', async (req, res) => {
  try {
    const { classLevel } = req.params;
    const { section } = req.query;
    const pool = req.db;

    let query = `
      SELECT s.*, u.phone 
      FROM students s
      JOIN users u ON s.userId = u.id
      WHERE s.classLevel = $1 AND u.role = 'student'
    `;
    const params = [classLevel];

    if (section) {
      query += ' AND s.section = $2';
      params.push(section);
    }

    query += ' ORDER BY s.name';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      students: result.rows,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

export default router;

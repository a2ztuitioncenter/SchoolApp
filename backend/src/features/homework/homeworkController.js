import { homeworkModel } from './Homework.js';
import { getStudentByUserId } from '../student/Student.js';

export const getActiveAssignments = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No user session' });
    }
    const userId = req.user.userId;
    
    // Graceful fallback for admins/teachers previewing the student dashboard
    if (req.user.role !== 'student') {
      return res.json({ success: true, data: [] });
    }

    const student = await getStudentByUserId(req.db, userId);
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const assignments = await homeworkModel.getActiveAssignmentsForStudent(
      student.classLevel, 
      student.section, 
      student.id
    );

    res.json({ success: true, data: assignments });
  } catch (err) {
    console.error('getActiveAssignments:', err);
    res.status(500).json({ success: false, error: 'Server error', detail: err.message });
  }
};

export const createHomework = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      section = 'A', 
      subject 
    } = req.body;
    
    // Normalize field names from various potential sources (frontend vs internal)
    const classLevel = req.body.classLevel || req.body.class_level || req.body.class_name;
    const subjectId = req.body.subjectId || req.body.subject_id;
    const dueDate = req.body.dueDate || req.body.due_date;
    const assignedBy = req.user?.userId || req.body.assignedBy || req.body.assigned_by || null;
    
    let attachmentUrl = null;
    if (req.file) {
      attachmentUrl = `/uploads/homework/${req.file.filename}`;
    }

    // Comprehensive validation with specific error messages
    const errors = [];
    if (!title) errors.push('title is required');
    if (!classLevel) errors.push('classLevel is required');
    if (!subject && !subjectId) errors.push('subject or subjectId is required');

    if (errors.length > 0) {
      console.warn('Homework creation validation failed:', { errors, body: req.body });
      return res.status(400).json({ 
        success: false, 
        error: errors.join(', '),
        details: errors 
      });
    }

    const hw = await homeworkModel.create({ 
      title, 
      description, 
      classLevel, 
      section, 
      subjectId, 
      subject, 
      dueDate, 
      assignedBy, 
      attachmentUrl 
    });
    
    res.status(201).json({ success: true, message: 'Homework created', data: hw });
  } catch (err) {
    console.error('createHomework:', err);
    res.status(500).json({ success: false, error: 'Server error', detail: err.message });
  }
};

export const getAllHomework = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name || req.query.class_level || '';
    const section = req.query.section || '';
    const list = await homeworkModel.getAll(classLevel, section);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('getAllHomework:', err);
    res.status(500).json({ success: false, error: 'Server error', detail: err.message });
  }
};

export const getHomeworkById = async (req, res) => {
  try {
    const hw = await homeworkModel.getById(req.params.id);
    if (!hw) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: hw });
  } catch (err) {
    console.error('getHomeworkById:', err);
    res.status(500).json({ success: false, error: 'Server error', detail: err.message });
  }
};

export const updateHomework = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      section = 'A', 
      subject,
      attachmentUrl: bodyAttachmentUrl 
    } = req.body;

    const classLevel = req.body.classLevel || req.body.class_level || req.body.class_name;
    const subjectId = req.body.subjectId || req.body.subject_id;
    const dueDate = req.body.dueDate || req.body.due_date;
    
    let attachmentUrl = bodyAttachmentUrl || null;
    if (req.file) {
      attachmentUrl = `/uploads/homework/${req.file.filename}`;
    }

    // Comprehensive validation
    const errors = [];
    if (!title) errors.push('title is required');
    if (!classLevel) errors.push('classLevel is required');
    if (!subject && !subjectId) errors.push('subject or subjectId is required');

    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: errors.join(', '),
        details: errors 
      });
    }

    const hw = await homeworkModel.update(req.params.id, { 
      title, 
      description, 
      classLevel, 
      section, 
      subjectId, 
      subject, 
      dueDate, 
      attachmentUrl 
    });
    
    if (!hw) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Updated', data: hw });
  } catch (err) {
    console.error('updateHomework:', err);
    res.status(500).json({ success: false, error: 'Server error', detail: err.message });
  }
};

export const deleteHomework = async (req, res) => {
  try {
    const deleted = await homeworkModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Homework deleted' });
  } catch (err) {
    console.error('deleteHomework:', err);
    res.status(500).json({ success: false, error: 'Server error', detail: err.message });
  }
};

import { homeworkModel } from './Homework.js';

export const createHomework = async (req, res) => {
  try {
    // Accept both camelCase and snake_case for compatibility
    const title = req.body.title;
    const description = req.body.description;
    const classLevel = req.body.classLevel || req.body.class_name;
    const subject = req.body.subject;
    const dueDate = req.body.dueDate || req.body.due_date;
    const assignedBy = req.body.assignedBy || req.body.assigned_by || req.user?.id || null;
    let attachmentUrl = null;

    if (req.file) {
      attachmentUrl = `/uploads/homework/${req.file.filename}`;
    }

    if (!title || !classLevel || !subject)
      return res.status(400).json({ error: 'title, classLevel, subject required' });

    const hw = await homeworkModel.create({ title, description, classLevel, subject, dueDate, assignedBy, attachmentUrl });
    res.status(201).json({ message: 'Homework created', data: hw });
  } catch (err) {
    console.error('createHomework:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getAllHomework = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name || '';
    const list = await homeworkModel.getAll(classLevel);
    res.json({ data: list });
  } catch (err) {
    console.error('getAllHomework:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getHomeworkById = async (req, res) => {
  try {
    const hw = await homeworkModel.getById(req.params.id);
    if (!hw) return res.status(404).json({ error: 'Not found' });
    res.json({ data: hw });
  } catch (err) {
    console.error('getHomeworkById:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const updateHomework = async (req, res) => {
  try {
    const title = req.body.title;
    const description = req.body.description;
    const classLevel = req.body.classLevel || req.body.class_name;
    const subject = req.body.subject;
    const dueDate = req.body.dueDate || req.body.due_date;
    let attachmentUrl = req.body.attachmentUrl || null;

    if (req.file) {
      attachmentUrl = `/uploads/homework/${req.file.filename}`;
    }

    if (!title || !classLevel || !subject)
      return res.status(400).json({ error: 'title, classLevel, subject required' });

    const hw = await homeworkModel.update(req.params.id, { title, description, classLevel, subject, dueDate, attachmentUrl });
    if (!hw) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', data: hw });
  } catch (err) {
    console.error('updateHomework:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const deleteHomework = async (req, res) => {
  try {
    const deleted = await homeworkModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Homework deleted' });
  } catch (err) {
    console.error('deleteHomework:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
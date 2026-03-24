import { homeworkModel } from '../models/Homework.js';

export const createHomework = async (req, res) => {
  try {
    const { title, description, class_name, subject, due_date } = req.body;
    const assigned_by = req.user?.id || null;
    if (!title || !class_name || !subject)
      return res.status(400).json({ error: 'title, class_name, subject required' });
    const hw = await homeworkModel.create({ title, description, class_name, subject, due_date, assigned_by });
    res.status(201).json({ message: 'Homework created', data: hw });
  } catch (err) {
    console.error('createHomework:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllHomework = async (req, res) => {
  try {
    const { class_name } = req.query;
    const list = class_name
      ? await homeworkModel.getByClass(class_name)
      : await homeworkModel.getAll();
    res.json({ data: list });
  } catch (err) {
    console.error('getAllHomework:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getHomeworkById = async (req, res) => {
  try {
    const hw = await homeworkModel.getById(req.params.id);
    if (!hw) return res.status(404).json({ error: 'Not found' });
    res.json({ data: hw });
  } catch (err) {
    console.error('getHomeworkById:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateHomework = async (req, res) => {
  try {
    const { title, description, class_name, subject, due_date } = req.body;
    if (!title || !class_name || !subject)
      return res.status(400).json({ error: 'title, class_name, subject required' });
    const hw = await homeworkModel.update(req.params.id, { title, description, class_name, subject, due_date });
    if (!hw) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', data: hw });
  } catch (err) {
    console.error('updateHomework:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteHomework = async (req, res) => {
  try {
    const deleted = await homeworkModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Homework deleted' });
  } catch (err) {
    console.error('deleteHomework:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
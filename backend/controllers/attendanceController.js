import { attendanceModel } from '../models/Attendance.js';

export const markAttendance = async (req, res) => {
  try {
    const { student_id, class_name, date, status } = req.body;
    const marked_by = req.user?.id || null;
    if (!student_id || !class_name || !date || !status)
      return res.status(400).json({ error: 'student_id, class_name, date, status required' });
    const record = await attendanceModel.markAttendance({ student_id, class_name, date, status, marked_by });
    res.status(201).json({ message: 'Attendance marked', data: record });
  } catch (err) {
    console.error('markAttendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const markBulkAttendance = async (req, res) => {
  try {
    const { records } = req.body;
    const marked_by = req.user?.id || null;
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ error: 'records[] array required' });
    const results = await attendanceModel.markBulk(records, marked_by);
    res.status(201).json({ message: `${results.length} records saved`, data: results });
  } catch (err) {
    console.error('markBulkAttendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getByClassAndDate = async (req, res) => {
  try {
    const { class_name, date } = req.query;
    if (!class_name || !date)
      return res.status(400).json({ error: 'class_name and date required' });
    const records = await attendanceModel.getByClassAndDate(class_name, date);
    res.json({ data: records });
  } catch (err) {
    console.error('getByClassAndDate:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStudentsByClass = async (req, res) => {
  try {
    const { class_name } = req.query;
    if (!class_name)
      return res.status(400).json({ error: 'class_name required' });
    const students = await attendanceModel.getStudentsByClass(class_name);
    res.json({ data: students });
  } catch (err) {
    console.error('getStudentsByClass:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getByStudent = async (req, res) => {
  try {
    const records = await attendanceModel.getByStudent(req.params.student_id);
    res.json({ data: records });
  } catch (err) {
    console.error('getByStudent:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const { class_name, month } = req.query;
    if (!class_name || !month)
      return res.status(400).json({ error: 'class_name and month required' });
    const summary = await attendanceModel.getMonthlySummary(class_name, month);
    res.json({ data: summary });
  } catch (err) {
    console.error('getMonthlySummary:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getClasses = async (req, res) => {
  try {
    const classes = await attendanceModel.getAllClasses();
    res.json({ data: classes });
  } catch (err) {
    console.error('getClasses:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
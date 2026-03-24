import { attendanceModel } from '../models/Attendance.js';

export const markAttendance = async (req, res) => {
  try {
    const { studentId, classLevel, date, status } = req.body;
    if (!studentId || !classLevel || !date || !status)
      return res.status(400).json({ error: 'studentId, classLevel, date, status required' });
    const record = await attendanceModel.markBulk(
      [{ studentId, classLevel, date, status }],
      req.user?.id || null
    );
    res.status(201).json({ message: 'Attendance marked', data: record[0] });
  } catch (err) {
    console.error('markAttendance:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const markBulkAttendance = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ error: 'records[] array required' });
    const results = await attendanceModel.markBulk(records, req.user?.id || null);
    res.status(201).json({ message: `${results.length} records saved`, data: results });
  } catch (err) {
    console.error('markBulkAttendance:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getByClassAndDate = async (req, res) => {
  try {
    // Accept both classLevel and class_name for compatibility
    const classLevel = req.query.classLevel || req.query.class_name;
    const { date } = req.query;
    if (!classLevel || !date)
      return res.status(400).json({ error: 'classLevel and date required' });
    const records = await attendanceModel.getByClassAndDate(classLevel, date);
    res.json({ data: records });
  } catch (err) {
    console.error('getByClassAndDate:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getStudentsByClass = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name;
    if (!classLevel)
      return res.status(400).json({ error: 'classLevel required' });
    const students = await attendanceModel.getStudentsByClass(classLevel);
    res.json({ data: students });
  } catch (err) {
    console.error('getStudentsByClass:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getByStudent = async (req, res) => {
  try {
    const records = await attendanceModel.getByStudent(req.params.student_id);
    res.json({ data: records });
  } catch (err) {
    console.error('getByStudent:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name;
    const { month } = req.query;
    if (!classLevel || !month)
      return res.status(400).json({ error: 'classLevel and month required' });
    const summary = await attendanceModel.getMonthlySummary(classLevel, month);
    res.json({ data: summary });
  } catch (err) {
    console.error('getMonthlySummary:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getClasses = async (req, res) => {
  try {
    const classes = await attendanceModel.getAllClasses();
    res.json({ data: classes });
  } catch (err) {
    console.error('getClasses:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
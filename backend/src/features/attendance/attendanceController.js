import { attendanceModel } from './Attendance.js';

export const markAttendance = async (req, res) => {
  try {
    const { studentId, classLevel, date, status, is_present } = req.body;
    const final_present = is_present !== undefined ? is_present : (status === 'present' || status === 'true' || status === true);
    
    if (!studentId || !classLevel || !date)
      return res.status(400).json({ error: 'studentId, classLevel, date required' });
      
    const record = await attendanceModel.markBulk(
      [{ studentId, classLevel, date, is_present: final_present }],
      req.user?.userId || null
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
    const results = await attendanceModel.markBulk(records, req.user?.userId || null);
    res.status(201).json({ message: `${results.length} records saved`, data: results });
  } catch (err) {
    console.error('markBulkAttendance:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getByClassAndDate = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name || req.query.class_level;
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
    const classLevel = req.query.classLevel || req.query.class_name || req.query.class_level;
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
    const classLevel = req.query.classLevel || req.query.class_name || req.query.class_level;
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

export const getSectionsByClass = async (req, res) => {
  try {
    const { classLevel } = req.query;
    if (!classLevel)
      return res.status(400).json({ error: 'classLevel required' });
    const sections = await attendanceModel.getSectionsByClass(classLevel);
    res.json({ data: sections });
  } catch (err) {
    console.error('getSectionsByClass:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const getMonthlyOverallAttendance = async (req, res) => {
  try {
    const { month } = req.query;
    const stats = await attendanceModel.getMonthlyOverallAttendance(month);
    res.json(stats);
  } catch (err) {
    console.error('getMonthlyOverallAttendance:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

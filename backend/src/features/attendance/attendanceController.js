import { attendanceModel } from './Attendance.js';

export const markAttendance = async (req, res) => {
  try {
    const { studentId, classLevel, section, date, status, is_present } = req.body;
    const final_present = is_present !== undefined ? is_present : (status === 'present' || status === 'true' || status === true);

    if (!studentId || !classLevel || !date)
      return res.status(400).json({ error: 'studentId, classLevel, date required' });

    const record = await attendanceModel.markBulk(
      [{ studentId, classLevel, section: section || 'A', date, is_present: final_present }],
      req.user?.userId || null,
      req.user?.schoolId
    );
    res.status(201).json({ success: true, message: 'Attendance marked', data: record[0] });
  } catch (err) {
    console.error('markAttendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const markBulkAttendance = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ error: 'records[] array required' });
    const normalizedRecords = records.map(({ studentId, classLevel, section, date, status, is_present }) => ({
      studentId,
      classLevel,
      section: section || 'A',
      date,
      is_present: is_present !== undefined ? is_present : (status === 'present' || status === 'true' || status === true)
    }));
    const results = await attendanceModel.markBulk(normalizedRecords, req.user?.userId || null, req.user?.schoolId); res.status(201).json({ success: true, message: `${results.length} records saved`, data: results });
  } catch (err) {
    console.error('markBulkAttendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getByClassAndDate = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name || req.query.class_level;
    const { date, section } = req.query;
    if (!classLevel || !date)
      return res.status(400).json({ error: 'classLevel and date required' });
    const records = await attendanceModel.getByClassAndDate(classLevel, date, section || 'A', req.user?.schoolId);
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('getByClassAndDate:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStudentsByClass = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name || req.query.class_level;
    const section = req.query.section || 'A';
    if (!classLevel)
      return res.status(400).json({ error: 'classLevel required' });
    const students = await attendanceModel.getStudentsByClass(classLevel, section, req.user?.schoolId);
    res.json({ success: true, data: students });
  } catch (err) {
    console.error('getStudentsByClass:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getByStudent = async (req, res) => {
  try {
    const records = await attendanceModel.getByStudent(req.params.student_id, req.user?.schoolId);
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('getByStudent:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMonthlySummary = async (req, res) => {
  const { classLevel, month, section } = req.query;
  console.log(`[ATTENDANCE] getMonthlySummary | Class: ${classLevel} | Month: ${month} | Section: ${section} | User: ${req.user?.userId}`);
  
  try {
    const finalClassLevel = classLevel || req.query.class_name || req.query.class_level;
    if (!finalClassLevel || !month)
      return res.status(400).json({ error: 'classLevel and month required' });
    const summary = await attendanceModel.getMonthlySummary(finalClassLevel, month, section || 'A', req.user?.schoolId);
    console.log(`[ATTENDANCE] Summary fetched: ${summary.length} records`);
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[ATTENDANCE] getMonthlySummary ERROR:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export const getClasses = async (req, res) => {
  try {
    const classes = await attendanceModel.getAllClasses(req.user?.schoolId);
    res.json({ success: true, data: classes });
  } catch (err) {
    console.error('getClasses:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSectionsByClass = async (req, res) => {
  try {
    const { classLevel } = req.query;
    if (!classLevel)
      return res.status(400).json({ error: 'classLevel required' });
    const sections = await attendanceModel.getSectionsByClass(classLevel, req.user?.schoolId);
    res.json({ success: true, data: sections });
  } catch (err) {
    console.error('getSectionsByClass:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMonthlyOverallAttendance = async (req, res) => {
  try {
    const { month } = req.query;
    const stats = await attendanceModel.getMonthlyOverallAttendance(month, req.user?.schoolId);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('getMonthlyOverallAttendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

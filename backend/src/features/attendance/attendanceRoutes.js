import express from 'express';
import {
  markAttendance, markBulkAttendance,
  getByClassAndDate, getStudentsByClass,
  getByStudent, getMonthlySummary, getClasses, getSectionsByClass, getMonthlyOverallAttendance
} from './attendanceController.js';

const router = express.Router();

router.get('/classes',             getClasses);
router.get('/sections',            getSectionsByClass);
router.get('/students',            getStudentsByClass);
router.get('/class',               getByClassAndDate);
router.get('/student/:student_id', getByStudent);
router.get('/summary',             getMonthlySummary);
router.get('/overall-summary',     getMonthlyOverallAttendance);
router.get('/overall-monthly',     getMonthlyOverallAttendance); // Alias for frontend compatibility
router.post('/mark',               markAttendance);
router.post('/mark-bulk',          markBulkAttendance);

export default router;

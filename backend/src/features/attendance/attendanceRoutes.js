import express from 'express';
import {
  markAttendance, markBulkAttendance,
  getByClassAndDate, getStudentsByClass,
  getByStudent, getMonthlySummary, getClasses, getSectionsByClass
} from './attendanceController.js';

const router = express.Router();

router.get('/classes',             getClasses);
router.get('/sections',            getSectionsByClass);
router.get('/students',            getStudentsByClass);
router.get('/class',               getByClassAndDate);
router.get('/student/:student_id', getByStudent);
router.get('/summary',             getMonthlySummary);
router.post('/mark',               markAttendance);
router.post('/mark-bulk',          markBulkAttendance);

export default router;

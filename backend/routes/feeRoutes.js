import express from 'express';
import {
  addFee, getAllFees, getUnpaidFees,
  getFeesByStudent, markPaid, markUnpaid,
  deleteFee, getFeeStats
} from '../controllers/feeController.js';

const router = express.Router();

router.get('/',                    getAllFees);
router.get('/unpaid',              getUnpaidFees);
router.get('/stats',               getFeeStats);
router.get('/student/:student_id', getFeesByStudent);
router.post('/',                   addFee);
router.patch('/:id/paid',          markPaid);
router.patch('/:id/unpaid',        markUnpaid);
router.delete('/:id',              deleteFee);

export default router;
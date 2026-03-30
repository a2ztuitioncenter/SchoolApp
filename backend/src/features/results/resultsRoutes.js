import express from 'express';
import { getResultsByStudent, createResult } from './resultsController.js';

const router = express.Router();

router.get('/:student', getResultsByStudent);
router.post('/', createResult);

export default router;

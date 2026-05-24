import express from 'express';
import { createTicket, getTickets } from './supportController.js';

const router = express.Router();

router.post('/tickets', createTicket);
router.get('/tickets', getTickets);

export default router;

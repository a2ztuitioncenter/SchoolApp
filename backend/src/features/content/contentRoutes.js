import express from 'express';
import { getContent } from './contentController.js';

const router = express.Router();

router.get('/', getContent);

export default router;

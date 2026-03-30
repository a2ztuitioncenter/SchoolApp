import express from 'express';
import { downloadFile } from './downloadController.js';

const router = express.Router();

// Route for downloading files via fetch blob
router.get('/', downloadFile);

export default router;

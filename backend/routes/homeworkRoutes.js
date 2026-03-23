import express from 'express';
import {
  createHomework, getAllHomework,
  getHomeworkById, updateHomework, deleteHomework
} from '../controllers/homeworkController.js';

const router = express.Router();

router.get('/',      getAllHomework);
router.get('/:id',   getHomeworkById);
router.post('/',     createHomework);
router.put('/:id',   updateHomework);
router.delete('/:id', deleteHomework);

export default router;
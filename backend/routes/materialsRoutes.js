import express from 'express';
import { getAllMaterials, createMaterial, deleteMaterial } from '../controllers/materialsController.js';

const router = express.Router();

router.get('/', getAllMaterials);
router.post('/', createMaterial);
router.delete('/:id', deleteMaterial);

export default router;

import express from 'express';
import multer from 'multer';
import path from 'path';
import { editMaterial, listMaterials, removeMaterial, uploadMaterial } from './materialsController.js';

// Multer Config for Materials
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/materials/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, image, and document files are allowed'));
    }
  }
});

const router = express.Router();

router.get('/', listMaterials);
router.post('/upload', upload.single('materialFile'), uploadMaterial);
router.put('/:id', upload.single('materialFile'), editMaterial);
router.delete('/:id', removeMaterial);

export default router;

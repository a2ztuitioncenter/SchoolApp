import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
    getAllMaterials, 
    createMaterial, 
    updateMaterial, 
    deleteMaterial, 
    getClassMaterials 
} from './materialsController.js';

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
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and PDF allowed'));
    }
  }
});

const router = express.Router();

// Student Routes (more specific - should come first)
router.get('/class/:classLevel', getClassMaterials);

// Admin Routes
router.get('/', getAllMaterials);
router.post('/', upload.single('materialFile'), createMaterial);
router.put('/:id', upload.single('materialFile'), updateMaterial);
router.delete('/:id', deleteMaterial);

export default router;

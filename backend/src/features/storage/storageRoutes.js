import express from 'express';
import { storageController } from './storageController.js';
import { authenticate, authorize } from '../../middleware/auth-middleware.js';
import { handleFileUpload } from '../../middleware/file-upload.js';

const router = express.Router();

// 1. Upload API: POST /api/upload
// Requirement: Admin and Teachers only can upload
// handleFileUpload handles multer + strict validation (type/size)
router.post('/upload', authenticate, authorize(['admin', 'teacher', 'student']), handleFileUpload, storageController.upload);
// 2. Fetch API: GET /api/files
// Requirement: Accessible to authorized users (based on class/section logic in controller)
router.get('/files', authenticate, storageController.list);

// 3. Download API — key may contain slashes (e.g. homework/class-12/section-a/file.pdf)
// Named wildcard required by Express 5 / path-to-regexp v8
router.get('/download/*key', authenticate, storageController.download);

// 4. Delete API: DELETE /api/files/:id
// Requirement: Only admin/authorized teacher can delete
router.delete('/files/:id', authenticate, authorize(['admin', 'teacher']), storageController.delete);

export default router;

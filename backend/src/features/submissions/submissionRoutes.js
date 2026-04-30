import express from 'express';
import multer from 'multer';
import { 
    submitHomework, 
    getStudentSubmissions, 
    getHomeworkSubmissions, 
    getTeacherSubmissions,
    reviewSubmission 
} from './submissionController.js';
import { authenticate, authorize, requireSelfOrAdmin } from '../../middleware/auth-middleware.js';

const router = express.Router();

// Multer config for submissions (memory storage since we upload to Drive)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG and PDF allowed'));
        }
    }
});

// All submission routes require authentication
router.use(authenticate);

// Student: Submit homework
router.post('/', authorize(['student']), upload.single('submission'), submitHomework);

// Student: Get own submissions
router.get('/student/:userId', requireSelfOrAdmin('userId'), getStudentSubmissions);

// Teacher: Get submissions for a specific homework
router.get('/homework/:homeworkId', authorize(['teacher', 'staff', 'admin']), getHomeworkSubmissions);

// Teacher: Get all submissions for their classes
router.get('/teacher', authorize(['teacher', 'staff', 'admin']), getTeacherSubmissions);

// Teacher: Review a submission
router.put('/:id/review', authorize(['teacher', 'staff', 'admin']), reviewSubmission);

export default router;

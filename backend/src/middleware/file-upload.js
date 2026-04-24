import multer from 'multer';
import path from 'path';

const ALLOWED_EXTENSIONS = ['.zip', '.jpeg', '.jpg', '.pdf', '.docx', '.xlsx', '.csv'];
const MAX_SIZES = {
    study_material: 5 * 1024 * 1024, // 5 MB
    homework: 2 * 1024 * 1024,      // 2 MB
    assignment: 2 * 1024 * 1024,    // 2 MB
    default: 2 * 1024 * 1024        // 2 MB
};

// 1. File Type Filter
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        // Return 400 later via error handler or middleware
        cb(new Error('Invalid file type'), false);
    }
};

// 2. Multer Instance with Max Possible Limit (5MB)
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 
    }
}).single('file');

// 3. Wrapper Middleware to handle Multer errors and specific size validation
export const handleFileUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'File size exceeds limit' });
            }
            return res.status(400).json({ success: false, error: err.message });
        } else if (err) {
            if (err.message === 'Invalid file type') {
                return res.status(400).json({ success: false, error: 'Invalid file type' });
            }
            return res.status(500).json({ success: false, error: err.message });
        }

        // Multer passed, now check dynamic size limit based on 'type'
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const type = req.body.type || 'default';
        const maxSize = MAX_SIZES[type] || MAX_SIZES.default;

        if (req.file.size > maxSize) {
            return res.status(400).json({ success: false, error: 'File size exceeds limit' });
        }

        next();
    });
};

import multer from 'multer';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';

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
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'File size exceeds limit' });
            }
            return res.status(400).json({ success: false, error: 'File upload failed' });
        } else if (err) {
            if (err.message === 'Invalid file type') {
                return res.status(400).json({ success: false, error: 'Invalid file type' });
            }
            console.error('Unexpected upload error:', err);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }

        // Multer passed, now check dynamic size limit based on 'type'
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const type = req.query.type || req.body.type || 'default';
        const maxSize = MAX_SIZES[type] || MAX_SIZES.default;

        if (req.file.size > maxSize) {
            return res.status(400).json({ success: false, error: 'File size exceeds limit' });
        }

        // 4. Validate actual file content (signatures)
        const validateContent = async () => {
            const typeInfo = await fileTypeFromBuffer(req.file.buffer);
            const ext = path.extname(req.file.originalname).toLowerCase();
            
            // Map common extensions to their expected MIME types from file-type
            const mimeMap = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.zip': 'application/zip',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };

            // For formats file-type reliably detects
            if (mimeMap[ext]) {
                // Special case for Office docs which file-type might detect as 'application/zip'
                if (ext === '.docx' || ext === '.xlsx') {
                    if (typeInfo && (typeInfo.mime === mimeMap[ext] || typeInfo.mime === 'application/zip')) {
                        return true;
                    }
                } else if (typeInfo && typeInfo.mime === mimeMap[ext]) {
                    return true;
                }
                return false;
            }

            // For CSV/Text files, file-type usually returns undefined
            if (ext === '.csv') {
                return !typeInfo; // CSV should not have a binary signature
            }

            return true; // Fallback for other types
        };

        validateContent().then(isValid => {
            if (!isValid) {
                return res.status(400).json({ success: false, error: 'File content mismatch. The uploaded file does not match its extension.' });
            }
            next();
        }).catch(err => {
            console.error('Content validation error:', err);
            next(); // Proceed on internal error to avoid blocking valid uploads, but log it
        });
        return;
    });
};

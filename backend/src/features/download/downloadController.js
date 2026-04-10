import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Securely downloads a file from the uploads directory
 * Prevents path traversal and ensuring correct binary headers
 */
export const downloadFile = async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath) {
            return res.status(400).json({ error: 'filePath is required' });
        }

        // Resolve absolute path and ensure it's within the uploads directory
        const uploadsDir = path.resolve('uploads');
        const absolutePath = path.resolve(uploadsDir, filePath.replace(/^\/?uploads\//, ''));

        if (!absolutePath.startsWith(uploadsDir)) {
            return res.status(403).json({ error: 'Access denied: Path traversal detected' });
        }

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        const fileName = path.basename(absolutePath);
        
        // Use res.download to handle binary headers and MIME types automatically
        res.download(absolutePath, fileName, (err) => {
            if (err) {
                console.error('Error during file download:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Could not download the file' });
                }
            }
        });
    } catch (err) {
        console.error('downloadFile Controller Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

import { googleDriveService } from '../../utils/googleDriveService.js';
import pool from '../../config/pool.js';

export const storageController = {
    async upload(req, res) {
        try {
            const { classLevel, section, type } = req.body;
            const file = req.file;

            if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });
            if (!classLevel || !section || !type) {
                return res.status(400).json({ success: false, error: 'Missing metadata (classLevel, section, type)' });
            }

            // 1. Get/Create Folder Path (Class > Section > Type)
            const folderId = await googleDriveService.getFolderPath(classLevel, section, type);

            // 2. Upload to Drive
            const driveFile = await googleDriveService.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
                folderId
            );

            // 3. Save to Database
            const result = await pool.query(
                `INSERT INTO app_files 
                (drive_file_id, file_name, class_level, section, uploaded_by, file_type, mime_type, file_size, web_view_link, download_link)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    driveFile.id,
                    driveFile.name,
                    classLevel,
                    section,
                    req.user?.userId || null,
                    type,
                    file.mimetype,
                    driveFile.size,
                    driveFile.webViewLink,
                    driveFile.webContentLink
                ]
            );

            res.status(201).json({
                success: true,
                data: {
                    fileId: driveFile.id,
                    dbId: result.rows[0].id,
                    fileName: driveFile.name,
                    webViewLink: driveFile.webViewLink,
                    downloadLink: `/api/storage/download/${driveFile.id}`
                }
            });
        } catch (error) {
            console.error('Upload Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async list(req, res) {
        try {
            const { class: classLevel, section, type } = req.query;
            let query = 'SELECT f.*, u.name as uploader_name FROM app_files f LEFT JOIN users u ON f.uploaded_by = u.id';
            const params = [];
            const conditions = [];

            if (classLevel) {
                params.push(classLevel);
                conditions.push(`f.class_level = $${params.length}`);
            }
            if (section) {
                params.push(section);
                conditions.push(`f.section = $${params.length}`);
            }
            if (type) {
                params.push(type);
                conditions.push(`f.file_type = $${params.length}`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' ORDER BY f.created_at DESC';

            const result = await pool.query(query, params);
            
            const files = result.rows.map(row => ({
                id: row.id,
                driveFileId: row.drive_file_id,
                name: row.file_name,
                viewLink: row.web_view_link,
                downloadLink: `/api/storage/download/${row.drive_file_id}`,
                uploadedBy: row.uploader_name || 'Admin',
                date: row.created_at,
                type: row.file_type,
                size: row.file_size
            }));

            res.json({ success: true, data: files });
        } catch (error) {
            console.error('List Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async download(req, res) {
        try {
            const { fileId } = req.params;
            const metadata = await googleDriveService.getFileMetadata(fileId);
            
            // FIX: Ensure binary integrity by setting correct headers and streaming directly
            // No utf8/base64 conversions allowed.
            res.setHeader('Content-Type', metadata.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${metadata.name}"`);
            
            if (metadata.size) {
                res.setHeader('Content-Length', metadata.size);
            }

            const stream = await googleDriveService.getFileStream(fileId);
            
            // Handle stream errors to prevent partial corrupted files
            stream.on('error', (err) => {
                console.error('Stream error during download:', err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, error: 'Download stream failed' });
                } else {
                    res.end();
                }
            });

            stream.pipe(res);
        } catch (error) {
            console.error('Download Error:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Failed to download file from Google Drive' });
            }
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT drive_file_id FROM app_files WHERE id = $1', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'File not found in database' });
            }

            const driveFileId = result.rows[0].drive_file_id;

            // 1. Delete from Drive
            await googleDriveService.deleteFile(driveFileId);

            // 2. Delete from DB
            await pool.query('DELETE FROM app_files WHERE id = $1', [id]);

            res.json({ success: true, message: 'File deleted successfully' });
        } catch (error) {
            console.error('Delete Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

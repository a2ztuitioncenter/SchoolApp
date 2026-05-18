import { googleDriveService } from '../../utils/googleDriveService.js';
import pool from '../../config/pool.js';

export const storageController = {
    async upload(req, res) {
        try {
            let { classLevel, section, type } = req.body;
            const file = req.file;

            if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

            // Type is required to organize the storage
            if (!type) {
                return res.status(400).json({ success: false, error: 'Missing file type (e.g., material, homework, submission)' });
            }

            // Fallback for missing metadata during "upload-first" phase
            if (!classLevel) classLevel = 'General';
            if (!section) section = 'All';

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
            let result;
            try {
                result = await pool.query(
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
            } catch (dbError) {
                // Compensate: remove orphaned Drive file
                console.error('DB insert failed, cleaning up Drive file:', driveFile.id);
                try {
                    await googleDriveService.deleteFile(driveFile.id);
                } catch (cleanupError) {
                    console.error('Failed to cleanup orphaned Drive file:', cleanupError.message);
                }
                throw dbError;
            }

            res.status(201).json({
                success: true,
                data: {
                    fileId: driveFile.id,
                    id: driveFile.id, // Alias for frontend
                    dbId: result.rows[0].id,
                    fileName: driveFile.name,
                    webViewLink: driveFile.webViewLink,
                    downloadLink: `/storage/download/${driveFile.id}`,
                    url: `/storage/download/${driveFile.id}` // Alias for frontend
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
                downloadLink: `/storage/download/${row.drive_file_id}`,
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
        const { fileId } = req.params;
        const isLocalMode = !process.env.GOOGLE_DRIVE_PARENT_ID;
        
        console.log(`[STORAGE DOWNLOAD] Initiating download request. fileId: ${fileId} | Mode: ${isLocalMode ? 'Local uploads directory' : 'Google Drive'}`);
        
        try {
            let metadata;
            try {
                metadata = await googleDriveService.getFileMetadata(fileId);
            } catch (metaError) {
                console.error(`[STORAGE DOWNLOAD] Metadata fetch failed for fileId: ${fileId}. Error:`, metaError);
                
                const message = metaError.message || '';
                const code = metaError.code;
                const status = metaError.status;
                const isNotFound = message.toLowerCase().includes('not found') || 
                                   code === 404 || 
                                   status === 404 || 
                                   message.includes('ENOENT');

                if (isNotFound) {
                    console.warn(`[STORAGE DOWNLOAD] [404] File not found: ${fileId}`);
                    return res.status(404).json({ success: false, error: 'File not found' });
                }
                
                return res.status(500).json({ success: false, error: 'Failed to retrieve file metadata' });
            }

            // RFC 5987 encoding for Content-Disposition (Security & Character Support)
            const filename = metadata.name || 'download';
            const asciiName = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
            const utf8Name = encodeURIComponent(filename).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

            res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`);

            if (metadata.size) {
                res.setHeader('Content-Length', metadata.size);
            }

            console.log(`[STORAGE DOWNLOAD] Metadata resolved. filename: ${filename} | size: ${metadata.size} bytes | mimeType: ${metadata.mimeType}`);

            let stream;
            try {
                stream = await googleDriveService.getFileStream(fileId);
            } catch (streamError) {
                console.error(`[STORAGE DOWNLOAD] Stream initialization failed for fileId: ${fileId}. Error:`, streamError);
                if (!res.headersSent) {
                    const message = streamError.message || '';
                    const isNotFound = message.toLowerCase().includes('not found') || 
                                       streamError.code === 404 || 
                                       streamError.status === 404;
                    if (isNotFound) {
                        return res.status(404).json({ success: false, error: 'File not found' });
                    }
                    return res.status(500).json({ success: false, error: 'Failed to initialize file stream' });
                }
                return res.end();
            }

            // Handle stream errors to prevent partial corrupted files
            stream.on('error', (err) => {
                console.error('[STORAGE DOWNLOAD] Stream error during pipe/download:', err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, error: 'Download stream failed' });
                } else {
                    res.end();
                }
            });

            console.log(`[STORAGE DOWNLOAD] Piping file stream to response for fileId: ${fileId}`);
            stream.pipe(res);
        } catch (error) {
            console.error('[STORAGE DOWNLOAD] [CRITICAL] Download controller error:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Internal server error during download' });
            }
        }
    },

    async delete(req, res) {
        let driveFileId = null;
        const { id } = req.params;

        try {
            // 1. Delete from DB first to prevent dangling references if DB fails
            const result = await pool.query(
                'DELETE FROM app_files WHERE id = $1 RETURNING drive_file_id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'File not found in database' });
            }

            driveFileId = result.rows[0].drive_file_id;
            console.log(`[Storage] DB record ${id} deleted successfully. Proceeding to Drive cleanup for: ${driveFileId}`);

            // 2. Attempt to delete from Drive
            try {
                await googleDriveService.deleteFile(driveFileId);
                console.log(`[Storage] Drive file ${driveFileId} deleted successfully.`);
            } catch (driveError) {
                // If Drive fails, we log it as a warning but don't fail the request 
                // since the DB is already clean. The file is orphaned but recoverable/ignorable.
                console.error(`[Storage] [WARNING] Orphaned Drive file detected: ${driveFileId}. Drive delete failed:`, driveError.message);
            }

            res.json({ success: true, message: 'File deleted successfully' });
        } catch (error) {
            console.error('[Storage] [CRITICAL] Delete Error (DB phase):', error);
            res.status(500).json({ success: false, error: 'Database operation failed. File was not deleted.' });
        }
    }
};

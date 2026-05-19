import path from 'path';
import { r2StorageService } from '../../utils/r2StorageService.js';
import pool from '../../config/pool.js';

export const storageController = {
    async upload(req, res) {
        try {
            let { classLevel, section, type } = req.body;
            const file = req.file;

            if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

            if (!type) {
                return res.status(400).json({ success: false, error: 'Missing file type (e.g., material, homework, submission)' });
            }

            // Fallback for missing metadata during "upload-first" phase
            if (!classLevel) classLevel = 'General';
            if (!section) section = 'All';

            // 1. Build organized R2 key (type/class/section/filename)
            const ext = path.extname(file.originalname || '');
            const uniqueName = `${type}_${classLevel}_${section}_${Date.now()}${ext}`;
            const key = r2StorageService.buildKey(type, classLevel, section, uniqueName);

            // 2. Upload to R2
            const r2File = await r2StorageService.uploadFile(file.buffer, key, file.mimetype);

            // 3. Save to Database
            let result;
            try {
                result = await pool.query(
                    `INSERT INTO app_files
                    (drive_file_id, file_name, class_level, section, uploaded_by, file_type, mime_type, file_size, web_view_link, download_link)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *`,
                    [
                        r2File.key,                   // reuse drive_file_id column to store R2 key
                        file.originalname || uniqueName,
                        classLevel,
                        section,
                        req.user?.userId || null,
                        type,
                        file.mimetype,
                        r2File.size,
                        r2File.url,                   // public URL if configured
                        r2File.downloadLink            // proxy download URL
                    ]
                );
            } catch (dbError) {
                // Compensate: remove orphaned R2 file
                console.error('DB insert failed, cleaning up R2 file:', key);
                try {
                    await r2StorageService.deleteFile(key);
                } catch (cleanupError) {
                    console.error('Failed to cleanup orphaned R2 file:', cleanupError.message);
                }
                throw dbError;
            }

            res.status(201).json({
                success: true,
                data: {
                    fileId: r2File.key,
                    id: r2File.key,         // alias for frontend
                    dbId: result.rows[0].id,
                    fileName: file.originalname || uniqueName,
                    webViewLink: r2File.url,
                    downloadLink: r2File.downloadLink,
                    url: r2File.downloadLink // alias for frontend
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
                r2Key: row.drive_file_id,   // R2 object key stored in this column
                name: row.file_name,
                viewLink: row.web_view_link,
                downloadLink: `/storage/download/${encodeURIComponent(row.drive_file_id)}`,
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
        // Express 5 named wildcard: req.params.key holds everything after /download/
        const rawKey = req.params.key || '';
        const key = decodeURIComponent(rawKey);

        console.log(`[STORAGE DOWNLOAD] key: ${key}`);

        try {
            // 1. Get metadata (content-type, size, filename)
            let metadata;
            try {
                metadata = await r2StorageService.getFileMetadata(key);
            } catch (metaError) {
                const msg = metaError.message || '';
                const isNotFound =
                    metaError.name === 'NoSuchKey' ||
                    msg.toLowerCase().includes('not found') ||
                    metaError.$metadata?.httpStatusCode === 404;

                if (isNotFound) {
                    return res.status(404).json({ success: false, error: 'File not found' });
                }
                console.error('[STORAGE DOWNLOAD] Metadata error:', metaError.message);
                return res.status(500).json({ success: false, error: 'Failed to retrieve file metadata' });
            }

            // 2. Set response headers
            const filename = metadata.name || 'download';
            const asciiName = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
            const utf8Name = encodeURIComponent(filename).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

            res.setHeader('Content-Type', metadata.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`);
            if (metadata.size) res.setHeader('Content-Length', metadata.size);

            // 3. Stream the file
            let stream;
            try {
                stream = await r2StorageService.getFileStream(key);
            } catch (streamError) {
                if (!res.headersSent) {
                    return res.status(500).json({ success: false, error: 'Failed to stream file' });
                }
                return res.end();
            }

            // stream is a Web ReadableStream from the AWS SDK — pipe it to Express response
            if (stream.pipe) {
                // Node.js Readable stream
                stream.on('error', err => {
                    console.error('[STORAGE DOWNLOAD] Stream error:', err);
                    if (!res.headersSent) res.status(500).end();
                    else res.end();
                });
                stream.pipe(res);
            } else {
                // Web ReadableStream (AWS SDK v3) — convert to Node stream
                const { Readable } = await import('stream');
                const nodeStream = Readable.fromWeb(stream);
                nodeStream.on('error', err => {
                    console.error('[STORAGE DOWNLOAD] Stream error:', err);
                    if (!res.headersSent) res.status(500).end();
                    else res.end();
                });
                nodeStream.pipe(res);
            }
        } catch (error) {
            console.error('[STORAGE DOWNLOAD] Critical error:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Internal server error during download' });
            }
        }
    },

    async delete(req, res) {
        const { id } = req.params;

        try {
            // 1. Remove from DB, get R2 key
            const result = await pool.query(
                'DELETE FROM app_files WHERE id = $1 RETURNING drive_file_id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'File not found in database' });
            }

            const r2Key = result.rows[0].drive_file_id;

            // 2. Delete from R2 (non-blocking — DB is already clean)
            try {
                await r2StorageService.deleteFile(r2Key);
            } catch (r2Error) {
                console.error(`[Storage] Orphaned R2 object "${r2Key}" — could not delete:`, r2Error.message);
            }

            res.json({ success: true, message: 'File deleted successfully' });
        } catch (error) {
            console.error('[Storage] Delete Error:', error);
            res.status(500).json({ success: false, error: 'Database operation failed. File was not deleted.' });
        }
    }
};

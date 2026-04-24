import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';

class GoogleDriveService {
    constructor() {
        this.scopes = ['https://www.googleapis.com/auth/drive.file'];
        this.folderCache = new Map();
        this.drive = null;
    }

    async init() {
        if (this.drive) return this.drive;

        try {
            const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
            if (!privateKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing');
            
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: privateKey,
                },
                scopes: this.scopes,
            });

            this.drive = google.drive({ version: 'v3', auth });
            return this.drive;
        } catch (error) {
            console.error('Failed to initialize Google Drive client:', error.message);
            throw new Error('Google Drive service initialization failed');
        }
    }

    async getOrCreateFolder(folderName, parentId = null) {
        const drive = await this.init();
        const cacheKey = `${parentId || 'root'}_${folderName}`;
        if (this.folderCache.has(cacheKey)) {
            return this.folderCache.get(cacheKey);
        }

        try {
            let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            if (parentId) {
                query += ` and '${parentId}' in parents`;
            }

            const response = await drive.files.list({
                q: query,
                fields: 'files(id, name)',
                spaces: 'drive',
            });

            if (response.data.files && response.data.files.length > 0) {
                const folderId = response.data.files[0].id;
                this.folderCache.set(cacheKey, folderId);
                return folderId;
            }

            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: parentId ? [parentId] : [],
            };

            const folder = await drive.files.create({
                requestBody: fileMetadata,
                fields: 'id',
            });

            this.folderCache.set(cacheKey, folder.data.id);
            return folder.data.id;
        } catch (error) {
            console.error(`Error in getOrCreateFolder for ${folderName}:`, error.message);
            throw error;
        }
    }

    async getFolderPath(classLevel, section, type) {
        const parentId = process.env.GOOGLE_DRIVE_PARENT_ID;
        let rootId;

        if (parentId) {
            rootId = parentId;
            console.log(`📂 Using provided GOOGLE_DRIVE_PARENT_ID: ${rootId}`);
        } else {
            const rootName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'Tuition App Storage';
            rootId = await this.getOrCreateFolder(rootName);
            console.warn('⚠️ No GOOGLE_DRIVE_PARENT_ID found. Using root folder created by service account (Quota may be limited).');
        }

        const classId = await this.getOrCreateFolder(`Class_${classLevel}`, rootId);
        const sectionId = await this.getOrCreateFolder(`Section_${section}`, classId);
        
        // Map types to display names if needed
        const typeFolderName = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
        const typeId = await this.getOrCreateFolder(typeFolderName, sectionId);
        
        return typeId;
    }

    async uploadFile(fileBuffer, fileName, mimeType, folderId) {
        if (!process.env.GOOGLE_DRIVE_PARENT_ID) {
            console.log('⚠️ Using LOCAL storage fallback because GOOGLE_DRIVE_PARENT_ID is missing.');
            const fs = await import('fs/promises');
            const uploadDir = path.join(process.cwd(), 'uploads');
            try {
                await fs.mkdir(uploadDir, { recursive: true });
            } catch (e) {}
            
            const sanitizedName = this.sanitizeFileName(fileName);
            const uniqueName = `${Date.now()}_${sanitizedName}`;
            const filePath = path.join(uploadDir, uniqueName);
            
            await fs.writeFile(filePath, fileBuffer);
            
            return {
                id: uniqueName,
                name: uniqueName,
                webViewLink: `/uploads/${uniqueName}`,
                webContentLink: `/uploads/${uniqueName}`,
                mimeType,
                size: fileBuffer.length,
                downloadLink: `/uploads/${uniqueName}`
            };
        }

        const drive = await this.init();
        
        // FIX: Use Readable.from for better binary integrity and stream handling
        const bufferStream = Readable.from(fileBuffer);

        const fileMetadata = {
            name: this.sanitizeFileName(fileName),
            parents: [folderId],
        };

        const media = {
            mimeType: mimeType,
            body: bufferStream,
        };

        try {
            const response = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, name, webViewLink, webContentLink, size, mimeType',
            });
            return {
                ...response.data,
                downloadLink: `/api/storage/download/${response.data.id}`
            };
        } catch (error) {
            if (error.message.includes('storage quota')) {
                console.error('❌ GOOGLE DRIVE ERROR: Service Account has no storage quota.');
                console.error('👉 FIX: Create a folder in your personal Google Drive, share it with the service account email as "Editor", and add its ID to GOOGLE_DRIVE_PARENT_ID in .env');
            }
            console.error('Error uploading file to Drive:', error.message);
            throw error;
        }
    }

    sanitizeFileName(fileName) {
        // Remove any path components and keep only the basename
        const base = path.basename(fileName);
        // Remove non-alphanumeric characters (except . - _) to avoid shell injection or encoding issues
        return base.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    }

    async deleteFile(fileId) {
        const drive = await this.init();
        try {
            await drive.files.delete({ fileId });
        } catch (error) {
            if (error.code === 404) {
                console.warn(`File ${fileId} not found in Drive, skipping deletion.`);
                return;
            }
            throw error;
        }
    }

    async getFileStream(fileId) {
        const drive = await this.init();
        try {
            const response = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'stream' }
            );
            return response.data;
        } catch (error) {
            console.error(`Error getting file stream for ${fileId}:`, error.message);
            throw error;
        }
    }

    async getFileMetadata(fileId) {
        const drive = await this.init();
        try {
            const response = await drive.files.get({
                fileId,
                fields: 'id, name, mimeType, size, webViewLink',
            });
            return response.data;
        } catch (error) {
            console.error(`Error getting metadata for ${fileId}:`, error.message);
            throw error;
        }
    }
}

export const googleDriveService = new GoogleDriveService();

import { googleDriveService } from '../../utils/googleDriveService.js';
import { getUserById } from '../auth/User.js';
import { fileTypeFromBuffer } from 'file-type';

export const updateProfile = async (req, res) => {
    const { name, email } = req.body;
    const userId = req.user.userId;
    const pool = req.db;

    try {
        // Fetch current user
        const user = await getUserById(pool, userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        let avatarUrl = user.avatarUrl || user.avatar_url;
        let avatarDriveId = user.avatarDriveId || user.avatar_drive_id;

        // Handle file upload if present
        if (req.file) {
            // 0. Validate actual file content (signatures)
            const typeInfo = await fileTypeFromBuffer(req.file.buffer);
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            
            if (!typeInfo || !allowedMimeTypes.includes(typeInfo.mime)) {
                return res.status(400).json({ success: false, error: 'Invalid file content. Only JPG and PNG images are allowed.' });
            }

            console.log('[PROFILE] Uploading new profile picture...');

            // 1. Get or create Profile Pictures folder
            const rootName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'Tuition App Storage';
            const rootId = await googleDriveService.getOrCreateFolder(rootName);
            const profilesFolderId = await googleDriveService.getOrCreateFolder('Profile_Pictures', rootId);

            // 2. Upload new file
            const extIndex = req.file.originalname.lastIndexOf('.');
            const ext = extIndex !== -1 ? req.file.originalname.substring(extIndex) : '';
            const fileName = `profile_${userId}_${Date.now()}${ext}`;
            const uploadResult = await googleDriveService.uploadFile(
                req.file.buffer,
                fileName,
                req.file.mimetype,
                profilesFolderId
            );

            // 3. Delete old file from Drive if it exists
            if (avatarDriveId) {
                try {
                    console.log(`[PROFILE] Deleting old profile picture: ${avatarDriveId}`);
                    await googleDriveService.deleteFile(avatarDriveId);
                } catch (delErr) {
                    console.warn('Failed to delete old avatar from Drive:', delErr.message);
                }
            }

            avatarDriveId = uploadResult.id;
            // Construct download link via our Google Drive download API
            avatarUrl = `/api/storage/download/${avatarDriveId}`;
        }

        // Check email uniqueness if email is being changed
        if (email && email !== user.email) {
            const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ success: false, error: 'Email is already in use' });
            }
        }

        // 4. Update database
        // We use a flexible update that only touches provided fields
        const result = await pool.query(
            `UPDATE users 
             SET name = COALESCE($2, name), 
                 email = COALESCE($3, email), 
                 avatar_url = $4, 
                 avatar_drive_id = $5 
             WHERE id = $1 RETURNING *`,
            [userId, name, email, avatarUrl, avatarDriveId]
        );

        const updatedUser = result.rows[0];

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                avatarUrl: updatedUser.avatar_url,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error('[PROFILE] Update Error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};

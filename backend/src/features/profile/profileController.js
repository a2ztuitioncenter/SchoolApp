import { googleDriveService } from '../../utils/googleDriveService.js';
import { getUserById } from '../auth/User.js';

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

        let avatarUrl = user.avatarUrl;
        let avatarDriveId = user.avatarDriveId;

        // Handle file upload if present
        if (req.file) {
            console.log('🔄 Uploading new profile picture...');

            // 1. Get or create Profile Pictures folder
            const rootName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'Tuition App Storage';
            const rootId = await googleDriveService.getOrCreateFolder(rootName);
            const profilesFolderId = await googleDriveService.getOrCreateFolder('Profile_Pictures', rootId);

            // 2. Upload new file
            const fileName = `profile_${userId}_${Date.now()}${req.file.originalname.substring(req.file.originalname.lastIndexOf('.'))}`;
            const uploadResult = await googleDriveService.uploadFile(
                req.file.buffer,
                fileName,
                req.file.mimetype,
                profilesFolderId
            );

            // 3. Delete old file from Drive if it exists
            if (avatarDriveId) {
                try {
                    console.log(`🗑️ Deleting old profile picture: ${avatarDriveId}`);
                    await googleDriveService.deleteFile(avatarDriveId);
                } catch (delErr) {
                    console.warn('Failed to delete old avatar from Drive:', delErr.message);
                }
            }

            avatarDriveId = uploadResult.id;
            // Construct download link via our Google Drive download API
            avatarUrl = `/api/storage/download/${avatarDriveId}`;
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
        console.error('❌ Profile Update Error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};

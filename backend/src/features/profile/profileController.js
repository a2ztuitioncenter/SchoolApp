import { r2StorageService } from '../../utils/r2StorageService.js';
import { getUserById } from '../auth/User.js';
import { fileTypeFromBuffer } from 'file-type';
import path from 'path';
import fs from 'fs';

export const updateProfile = async (req, res) => {
    const { name, email, avatarUrl: bodyAvatarUrl, avatarDriveId: bodyAvatarDriveId, fatherName, motherName, dateOfBirth } = req.body;
    const userId = req.user.userId;
    const pool = req.db;

    try {
        // Fetch current user
        const user = await getUserById(pool, userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        let avatarUrl = user.avatarUrl || user.avatar_url;
        let avatarDriveId = user.avatarDriveId || user.avatar_drive_id; // now stores R2 key

        // Handle file upload if present
        if (req.file) {
            // 0. Validate actual file content (signatures)
            const typeInfo = await fileTypeFromBuffer(req.file.buffer);
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];

            if (!typeInfo || !allowedMimeTypes.includes(typeInfo.mime)) {
                return res.status(400).json({ success: false, error: 'Invalid file content. Only JPG and PNG images are allowed.' });
            }

            console.log('[PROFILE] Uploading new profile picture to R2...');

            // 1. Upload new file to R2
            const extIndex = req.file.originalname.lastIndexOf('.');
            const ext = extIndex !== -1 ? req.file.originalname.substring(extIndex) : '';
            const fileName = `profile_${userId}_${Date.now()}${ext}`;
            const key = r2StorageService.buildKey('profile-images', 'users', String(userId), fileName);

            const uploadResult = await r2StorageService.uploadFile(
                req.file.buffer,
                key,
                req.file.mimetype
            );

            // 2. Delete old file from R2 if it exists (avatarDriveId now stores the R2 key)
            if (avatarDriveId) {
                try {
                    console.log(`[PROFILE] Deleting old profile picture from R2: ${avatarDriveId}`);
                    await r2StorageService.deleteFile(avatarDriveId);
                } catch (delErr) {
                    console.warn('Failed to delete old avatar from R2:', delErr.message);
                }
            }

            avatarDriveId = uploadResult.key;          // store R2 key for future deletion
            avatarUrl = uploadResult.downloadLink;     // proxy download URL
        } else {
            // Fallback to body-provided values if no new file is uploaded
            if (bodyAvatarUrl) avatarUrl = bodyAvatarUrl;
            if (bodyAvatarDriveId) avatarDriveId = bodyAvatarDriveId;
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

        // 3. Update database
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

        // 3.1. Update students table if the user is a student
        if (req.user.role === 'student') {
            const updates = [];
            const values = [userId];
            let paramIdx = 2;
            
            if (name !== undefined) {
                updates.push(`name = $${paramIdx++}`);
                values.push(name);
            }
            if (fatherName !== undefined) {
                updates.push(`father_name = $${paramIdx++}`);
                values.push(fatherName || null);
            }
            if (motherName !== undefined) {
                updates.push(`mother_name = $${paramIdx++}`);
                values.push(motherName || null);
            }
            if (dateOfBirth !== undefined) {
                updates.push(`date_of_birth = $${paramIdx++}`);
                values.push(dateOfBirth || null);
            }
            
            if (updates.length > 0) {
                await pool.query(
                    `UPDATE students
                     SET ${updates.join(', ')}
                     WHERE user_id = $1`,
                    values
                );
            }
        }

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
        try {
            fs.writeFileSync('m:\\WebDev\\projects\\tuition-app\\backend\\error.log', `[${new Date().toISOString()}] Profile Update Error:\n${error.stack || error}\n\nRequest body:\n${JSON.stringify(req.body, null, 2)}\n\nUser:\n${JSON.stringify(req.user, null, 2)}\n`);
        } catch (logErr) {
            console.error('Failed to write to error.log:', logErr);
        }
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};

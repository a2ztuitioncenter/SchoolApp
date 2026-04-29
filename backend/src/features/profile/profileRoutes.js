import express from 'express';
import { updateProfile } from './profileController.js';
import profilePicUpload from '../../middleware/profile-pic-upload.js';
import { authenticate } from '../../middleware/auth-middleware.js';

const router = express.Router();

router.put('/update', authenticate, profilePicUpload.single('avatar'), updateProfile);

export default router;

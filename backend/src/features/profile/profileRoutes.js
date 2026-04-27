import express from 'express';
import { updateProfile } from './profileController.js';
import profilePicUpload from '../../middleware/profile-pic-upload.js';

const router = express.Router();

import express from 'express';
import { updateProfile } from './profileController.js';
import profilePicUpload from '../../middleware/profile-pic-upload.js';
import authMiddleware from '../../middleware/auth.js';

const router = express.Router();

router.put('/update', authMiddleware, profilePicUpload.single('avatar'), updateProfile);

export default router;
export default router;

import express from 'express';
import { updateProfile } from './profileController.js';
import profilePicUpload from '../../middleware/profile-pic-upload.js';

const router = express.Router();

router.put('/update', profilePicUpload.single('avatar'), updateProfile);

export default router;

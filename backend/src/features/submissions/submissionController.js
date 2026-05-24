import { submissionModel } from './Submissions.js';
import { r2StorageService } from '../../utils/r2StorageService.js';
import { getStudentByUserId } from '../student/Student.js';
import { homeworkModel } from '../homework/Homework.js';
import { subjectModel } from '../subjects/subjectModel.js';
import path from 'path';
import { pushNotificationService } from '../../utils/pushNotificationService.js';

export const submitHomework = async (req, res) => {
    try {
        const { homeworkId } = req.body;
        const userId = req.user.userId;

        if (!homeworkId) {
            return res.status(400).json({ success: false, error: 'Homework ID is required' });
        }

        const student = await getStudentByUserId(req.db, userId);
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student profile not found' });
        }

        const homework = await homeworkModel.getById(homeworkId);
        if (!homework) {
            return res.status(404).json({ success: false, error: 'Homework not found' });
        }

        // Verify student is authorized to submit to this homework (must be in same class level)
        if (String(student.classLevel) !== String(homework.classLevel)) {
            return res.status(403).json({ success: false, error: 'Not authorized to submit to this homework (class mismatch)' });
        }

        let fileUrl = req.body.fileUrl;

        if (req.file) {
            // Clean up old submission file from R2 to prevent orphans
            try {
                const existingSubmission = await submissionModel.getStudentSubmission(homeworkId, student.id);
                if (existingSubmission && existingSubmission.file_url) {
                    const oldKey = r2StorageService.extractKeyFromUrl(existingSubmission.file_url);
                    if (oldKey) {
                        console.log(`[SUBMISSION] Deleting old submission file from R2: ${oldKey}`);
                        await r2StorageService.deleteFile(oldKey);
                    }
                }
            } catch (err) {
                console.warn('[SUBMISSION] Failed to clean up old file (non-blocking):', err.message);
            }

            // Upload to Cloudflare R2 — preserve original extension for correct MIME type
            const ext = path.extname(req.file.originalname || '');
            const safeName = `SUB_${student.name.replace(/\s+/g, '_')}_HW${homeworkId}_${Date.now()}${ext}`;
            const key = r2StorageService.buildKey('submissions', student.classLevel, student.section || 'A', safeName);
            
            console.log(`[UPLOAD START] User: ${userId} | File: ${req.file.originalname} | Size: ${req.file.size} bytes`);
            const uploadResult = await r2StorageService.uploadFile(
                req.file.buffer,
                key,
                req.file.mimetype
            );
            console.log(`[UPLOAD SUCCESS] Key: ${uploadResult.key} | Size: ${uploadResult.size}`);
            fileUrl = uploadResult.downloadLink;
        }

        if (!fileUrl) {
            return res.status(400).json({ success: false, error: 'File is required' });
        }

        const submission = await submissionModel.createOrUpdate({
            homeworkId,
            studentId: student.id,
            fileUrl
        });

        res.status(201).json({
            success: true,
            message: 'Homework submitted successfully',
            data: submissionModel.formatRow(submission)
        });
    } catch (err) {
        console.error('submitHomework error:', err);
        res.status(500).json({ success: false, error: 'Failed to submit homework' });
    }
};

export const getStudentSubmissions = async (req, res) => {
    try {
        const userId = req.params.userId;
        const requesterId = req.user.userId;
        const requesterRole = req.user.role;

        // Authorization: Only allow students to view their own submissions.
        // Teachers and admins are permitted to view any student's submissions.
        if (requesterRole === 'student' && String(requesterId) !== String(userId)) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view these submissions' });
        }

        const student = await getStudentByUserId(req.db, userId);
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const submissions = await submissionModel.getAllStudentSubmissions(student.id);
        res.json({ success: true, data: submissions.map(s => submissionModel.formatRow(s)) });
    } catch (err) {
        console.error('getStudentSubmissions error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }
};

export const getHomeworkSubmissions = async (req, res) => {
    try {
        const { homeworkId } = req.params;
        const teacherId = req.user.userId;

        const homework = await homeworkModel.getById(homeworkId);
        if (!homework) {
            return res.status(404).json({ success: false, error: 'Homework not found' });
        }

        // Verify teacher permission
        const hasPermission = homework.teacherId === teacherId ||
            await subjectModel.checkTeacherPermission(teacherId, homework.classLevel, homework.section, homework.subjectId);

        if (!hasPermission) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view these submissions' });
        }

        const submissions = await submissionModel.getHomeworkSubmissions(homeworkId);
        res.json({ success: true, data: submissions.map(s => submissionModel.formatRow(s)) });
    } catch (err) {
        console.error('getHomeworkSubmissions error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }
};

export const getTeacherSubmissions = async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const submissions = await submissionModel.getTeacherSubmissions(teacherId);
        res.json({ success: true, data: submissions.map(s => submissionModel.formatRow(s)) });
    } catch (err) {
        console.error('getTeacherSubmissions error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }
};

export const reviewSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarkText, marks } = req.body;
        const reviewerId = req.user.userId;

        const submission = await submissionModel.getById(id);
        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        // Verify teacher permission
        const hasPermission = submission.teacher_id === reviewerId ||
            await subjectModel.checkTeacherPermission(reviewerId, submission.class_level, submission.section, submission.subject_id);

        if (!hasPermission) {
            return res.status(403).json({ success: false, error: 'Unauthorized to review this submission' });
        }

        const updated = await submissionModel.review({
            submissionId: id,
            remarkText,
            marks,
            reviewedBy: reviewerId
        });

        // Trigger push notification to student asynchronously
        req.db.query('SELECT user_id FROM students WHERE id = $1', [submission.student_id])
            .then(studentRes => {
                if (studentRes.rows.length > 0) {
                    const studentUserId = studentRes.rows[0].user_id;
                    pushNotificationService.send(
                        studentUserId,
                        'Submission Reviewed 📝',
                        `Your assignment has been graded. Marks: ${marks || 'N/A'}. Remarks: "${remarkText || 'No remarks'}"`,
                        { screen: 'Assignments' }
                    ).catch(err => console.error('[PushNotify] Review send failed:', err.message));
                }
            })
            .catch(dbErr => console.error('[PushNotify] Student fetch failed:', dbErr.message));

        res.json({ success: true, message: 'Submission reviewed successfully', data: submissionModel.formatRow(updated) });
    } catch (err) {
        console.error('reviewSubmission error:', err);
        res.status(500).json({ success: false, error: 'Failed to review submission' });
    }
};

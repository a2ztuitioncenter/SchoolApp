import { submissionModel } from './Submissions.js';
import { googleDriveService } from '../../utils/googleDriveService.js';
import { getStudentByUserId } from '../student/Student.js';
import { homeworkModel } from '../homework/Homework.js';
import { subjectModel } from '../subjects/subjectModel.js';

export const submitHomework = async (req, res) => {
    try {
        const { homeworkId } = req.body;
        const userId = req.user.userId;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'File is required' });
        }

        const student = await getStudentByUserId(req.db, userId);
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student profile not found' });
        }

        const homework = await homeworkModel.getById(homeworkId);
        if (!homework) {
            return res.status(404).json({ success: false, error: 'Homework not found' });
        }

        // Upload to Google Drive
        // Organise by Class_X/Section_Y/Submissions/fileName
        const folderId = await googleDriveService.getFolderPath(student.classLevel, student.section || 'A', 'submissions');
        const uploadResult = await googleDriveService.uploadFile(
            req.file.buffer,
            `SUB_${student.name.replace(/\s+/g, '_')}_HW${homeworkId}_${Date.now()}`,
            req.file.mimetype,
            folderId
        );

        const submission = await submissionModel.createOrUpdate({
            homeworkId,
            studentId: student.id,
            fileUrl: uploadResult.downloadLink
        });

        res.status(201).json({
            success: true,
            message: 'Homework submitted successfully',
            data: submission
        });
    } catch (err) {
        console.error('submitHomework error:', err);
        res.status(500).json({ success: false, error: 'Failed to submit homework', message: err.message });
    }
};

export const getStudentSubmissions = async (req, res) => {
    try {
        const userId = req.params.userId;
        const student = await getStudentByUserId(req.db, userId);
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const submissions = await submissionModel.getAllStudentSubmissions(student.id);
        res.json({ success: true, data: submissions });
    } catch (err) {
        console.error('getStudentSubmissions error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions', message: err.message });
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
                             await subjectModel.checkTeacherPermission(teacherId, homework.classLevel);
        
        if (!hasPermission) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view these submissions' });
        }

        const submissions = await submissionModel.getHomeworkSubmissions(homeworkId);
        res.json({ success: true, data: submissions });
    } catch (err) {
        console.error('getHomeworkSubmissions error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions', message: err.message });
    }
};

export const getTeacherSubmissions = async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const submissions = await submissionModel.getTeacherSubmissions(teacherId);
        res.json({ success: true, data: submissions });
    } catch (err) {
        console.error('getTeacherSubmissions error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions', message: err.message });
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
                             await subjectModel.checkTeacherPermission(reviewerId, submission.class_level);
        
        if (!hasPermission) {
            return res.status(403).json({ success: false, error: 'Unauthorized to review this submission' });
        }

        const updated = await submissionModel.review({
            submissionId: id,
            remarkText,
            marks,
            reviewedBy: reviewerId
        });

        res.json({ success: true, message: 'Submission reviewed successfully', data: updated });
    } catch (err) {
        console.error('reviewSubmission error:', err);
        res.status(500).json({ success: false, error: 'Failed to review submission', message: err.message });
    }
};

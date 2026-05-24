import { homeworkModel } from './Homework.js';
import { getStudentByUserId } from '../student/Student.js';
import { r2StorageService } from '../../utils/r2StorageService.js';
import path from 'path';
import { pushNotificationService } from '../../utils/pushNotificationService.js';

// Helper: upload a multer memory-buffer to Cloudflare R2
async function uploadHomeworkFileToR2(file, classLevel, section, userId) {
  const ext = path.extname(file.originalname || '');
  const safeName = `HW_${classLevel}_${section || 'ALL'}_${Date.now()}${ext}`;
  const key = r2StorageService.buildKey('homework', classLevel, section || 'ALL', safeName);
  
  console.log(`[UPLOAD START] User: ${userId} | File: ${file.originalname} | Size: ${file.size} bytes`);
  const result = await r2StorageService.uploadFile(file.buffer, key, file.mimetype);
  console.log(`[UPLOAD SUCCESS] Key: ${result.key} | Size: ${result.size}`);
  
  return result.downloadLink; // '/storage/download/<encoded-key>'
}

export const getActiveAssignments = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No user session' });
    }
    const userId = req.user.userId;

    // Graceful fallback for admins/teachers previewing the student dashboard
    if (req.user.role !== 'student') {
      return res.json({ success: true, data: [] });
    }

    const student = await getStudentByUserId(req.db, userId);

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const assignments = await homeworkModel.getActiveAssignmentsForStudent(
      student.classLevel,
      student.section,
      student.id
    );

    res.json({ success: true, data: assignments });
  } catch (err) {
    console.error('getActiveAssignments:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const createHomework = async (req, res) => {
  try {
    const {
      title,
      description,
      section = 'A',
      subject
    } = req.body;

    // Normalize field names from various potential sources (frontend vs internal)
    const classLevel = req.body.classLevel || req.body.class_level || req.body.class_name;
    const subjectId = req.body.subjectId || req.body.subject_id;
    const dueDate = req.body.dueDate || req.body.due_date;
    const assignedBy = req.user?.userId || null;
    let attachmentUrl = req.body.fileUrl || req.body.attachmentUrl || null;
    if (req.file) {
      attachmentUrl = await uploadHomeworkFileToR2(req.file, classLevel || 'General', section || 'ALL', req.user?.userId);
    }

    // Comprehensive validation with specific error messages
    const errors = [];
    if (!title) errors.push('title is required');
    if (!classLevel) errors.push('classLevel is required');
    if (!subject && !subjectId) errors.push('subject or subjectId is required');

    if (errors.length > 0) {
      console.warn('Homework creation validation failed:', { errors, body: req.body });
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
        details: errors
      });
    }

    const hw = await homeworkModel.create({
      title,
      description,
      classLevel,
      section,
      subjectId,
      subject,
      dueDate,
      assignedBy,
      attachmentUrl
    });

    // Trigger push notification to student class/section asynchronously
    (async () => {
      try {
        const studentRes = await req.db.query(
          "SELECT user_id FROM students WHERE class_level = $1 AND (section = $2 OR section = 'ALL')",
          [classLevel, section]
        );
        const studentUserIds = studentRes.rows.map(s => s.user_id);
        
        if (studentUserIds.length > 0) {
          await pushNotificationService.send(
            studentUserIds,
            'New Assignment 📚',
            `New Assignment: "${title}" in ${subject || 'Subject'}`,
            { screen: 'Assignments' }
          );
        }
      } catch (pushErr) {
        console.error('[PushNotify] Homework notification failed:', pushErr.message);
      }
    })();

    res.status(201).json({ success: true, message: 'Homework created', data: hw });
  } catch (err) {
    console.error('createHomework:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getAllHomework = async (req, res) => {
  try {
    const classLevel = req.query.classLevel || req.query.class_name || req.query.class_level || '';
    const section = req.query.section || '';
    const list = await homeworkModel.getAll(classLevel, section);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('getAllHomework:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getHomeworkById = async (req, res) => {
  try {
    const hw = await homeworkModel.getById(req.params.id);
    if (!hw) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: hw });
  } catch (err) {
    console.error('getHomeworkById:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateHomework = async (req, res) => {
  try {
    const {
      title,
      description,
      section = 'A',
      subject,
      attachmentUrl: bodyAttachmentUrl
    } = req.body;

    const classLevel = req.body.classLevel || req.body.class_level || req.body.class_name;
    const subjectId = req.body.subjectId || req.body.subject_id;
    const dueDate = req.body.dueDate || req.body.due_date;

    let attachmentUrl = req.body.fileUrl || bodyAttachmentUrl || null;
    if (req.file) {
      // Clean up old attachment file from R2 to prevent orphans
      try {
        const oldHw = await homeworkModel.getById(req.params.id);
        if (oldHw && oldHw.attachmentUrl) {
          const oldKey = r2StorageService.extractKeyFromUrl(oldHw.attachmentUrl);
          if (oldKey) {
            console.log(`[HOMEWORK] Deleting old attachment from R2: ${oldKey}`);
            await r2StorageService.deleteFile(oldKey);
          }
        }
      } catch (err) {
        console.warn('[HOMEWORK] Failed to clean up old attachment:', err.message);
      }
      attachmentUrl = await uploadHomeworkFileToR2(req.file, classLevel || 'General', section || 'ALL', req.user?.userId);
    }

    // Comprehensive validation
    const errors = [];
    if (!title) errors.push('title is required');
    if (!classLevel) errors.push('classLevel is required');
    if (!subject && !subjectId) errors.push('subject or subjectId is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
        details: errors
      });
    }

    const hw = await homeworkModel.update(req.params.id, {
      title,
      description,
      classLevel,
      section,
      subjectId,
      subject,
      dueDate,
      attachmentUrl
    });

    if (!hw) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Updated', data: hw });
  } catch (err) {
    console.error('updateHomework:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const deleteHomework = async (req, res) => {
  try {
    // 1. Fetch homework details before deleting so we can clean up R2 attachment
    const hw = await homeworkModel.getById(req.params.id);
    if (!hw) return res.status(404).json({ success: false, error: 'Not found' });

    // 2. Perform DB delete
    const deleted = await homeworkModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });

    // 3. Clean up the R2 file (non-blocking)
    if (hw.attachmentUrl) {
      const oldKey = r2StorageService.extractKeyFromUrl(hw.attachmentUrl);
      if (oldKey) {
        console.log(`[HOMEWORK DELETE] Deleting orphaned R2 file key: ${oldKey}`);
        try {
          await r2StorageService.deleteFile(oldKey);
        } catch (delErr) {
          console.warn(`[HOMEWORK DELETE ERROR] Failed to delete from R2: ${oldKey}`, delErr.message);
        }
      }
    }

    res.json({ success: true, message: 'Homework deleted' });
  } catch (err) {
    console.error('deleteHomework:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

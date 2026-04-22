import express from 'express';
import { subjectModel } from './subjectModel.js';

const router = express.Router();

// ============================================
// SUBJECTS MANAGEMENT (ERP GRADE)
// ============================================

// --- MASTER SUBJECTS ---

// 1. Get ALL Master Subjects (Admin or for dropdowns)
router.get('/master', async (req, res) => {
    try {
        const subjects = await subjectModel.getMasterSubjects(req.db);
        res.json({ success: true, data: subjects });
    } catch (err) {
        console.error('Fetch master subjects error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch master subjects' });
    }
});

// 2. Create a Master Subject (Admin Only)
router.post('/admin', async (req, res) => {
    try {
        const { name, code } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Subject name is required' });
        }

        const authenticatedUser = req.user;
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only admins can create master subjects' });
        }

        const subject = await subjectModel.createMaster({ name, code }, req.db);
        res.status(201).json({ success: true, data: subject });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ success: false, error: 'Subject with this name or code already exists' });
        }
        console.error('Add master subject error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Delete Master Subject (Admin Only)
router.delete('/admin/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only admins can delete master subjects' });
        }
        await subjectModel.deleteMaster(req.params.id, req.db);
        res.json({ success: true, message: 'Subject deleted' });
    } catch (err) {
        console.error('Delete master subject error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete master subject' });
    }
});

// --- ASSIGNMENTS ---

// 4. Get Assignments (Filtered by Class/Section/Teacher)
router.get('/', async (req, res) => {
    try {
        const { classLevel, section, teacherId } = req.query;
        const subjects = await subjectModel.getSubjects({ 
            class_level: classLevel, 
            section, 
            teacher_id: teacherId 
        }, req.db);
        res.json({ success: true, data: subjects });
    } catch (err) {
        console.error('Fetch assigned subjects error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch assigned subjects' });
    }
});

// 5. Get Subjects for Logged-in Teacher
router.get('/teacher', async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ success: false, error: 'Only teachers can access this' });
        }
        const subjects = await subjectModel.getTeacherSubjects(req.user.userId, req.db);
        res.json({ success: true, data: subjects });
    } catch (err) {
        console.error('Fetch teacher subjects error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch teacher subjects' });
    }
});

// 6. Assign Subject to Class/Section/Teacher (Admin or Permitted Teacher)
router.post('/assign', async (req, res) => {
    try {
        const { subject_id, classLevel, section, teacher_id } = req.body;
        
        if (!subject_id || !classLevel || !teacher_id) {
            return res.status(400).json({ success: false, error: 'Subject, class, and teacher are required' });
        }

        const authenticatedUser = req.user;
        if (!authenticatedUser) return res.status(401).json({ error: 'Auth required' });

        // Teachers must be assigned to the class they are assigning a subject to
        if (authenticatedUser.role !== 'admin') {
            const hasPermission = await subjectModel.checkTeacherPermission(authenticatedUser.userId, classLevel, req.db);
            if (!hasPermission) {
                return res.status(403).json({ success: false, error: 'You are not assigned to this class' });
            }
        }

        const assignment = await subjectModel.assignSubject({
            subject_id,
            class_level: classLevel,
            section,
            teacher_id,
            assigned_by: authenticatedUser.userId
        }, req.db);

        res.status(201).json({ success: true, data: assignment });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ success: false, error: 'Subject already assigned to this teacher in this class/section' });
        }
        console.error('Assign subject error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Delete Assignment
router.delete('/assign/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only admins can remove subject assignments' }); // Can modify for teacher perm
        }
        await subjectModel.deleteAssignment(req.params.id, req.db);
        res.json({ success: true, message: 'Assignment removed' });
    } catch (err) {
        console.error('Delete assignment error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete assignment' });
    }
});

export default router;

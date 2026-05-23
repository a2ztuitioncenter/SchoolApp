import { doubtModel } from './doubtModel.js';
import { getStudentByUserId } from '../student/Student.js';
import { subjectModel } from '../subjects/subjectModel.js';

export const createDoubt = async (req, res) => {
  try {
    const { title, description, subjectId, teacherId, attachmentUrl } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, error: 'Title cannot exceed 200 characters' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }
    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'Subject is required' });
    }
    if (!teacherId) {
      return res.status(400).json({ success: false, error: 'Teacher is required' });
    }

    // Retrieve student metadata
    const student = await getStudentByUserId(req.db, req.user.userId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    // Security check: Query subject_assignments to verify teacher is assigned to student's class, section, and subject
    const isAssigned = await subjectModel.checkTeacherPermission(
      teacherId,
      student.classLevel,
      student.section,
      subjectId,
      req.db
    );

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Security boundary violated: The selected teacher is not assigned to this subject for your class/section.'
      });
    }

    // Perform database insertion
    const doubt = await doubtModel.create({
      studentId: student.id,
      teacherId,
      subjectId,
      title,
      description,
      attachmentUrl
    }, req.db);

    res.status(201).json({ success: true, data: doubt });
  } catch (err) {
    console.error('Error creating doubt:', err);
    res.status(500).json({ success: false, error: 'Failed to create doubt. Internal server error.' });
  }
};

export const getStudentDoubts = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.db, req.user.userId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const doubts = await doubtModel.getStudentDoubts(student.id, req.db);
    res.json({ success: true, data: doubts });
  } catch (err) {
    console.error('Error fetching student doubts:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch doubts' });
  }
};

export const getTeacherDoubts = async (req, res) => {
  try {
    const doubts = await doubtModel.getTeacherDoubts(req.user.userId, req.db);
    res.json({ success: true, data: doubts });
  } catch (err) {
    console.error('Error fetching teacher doubts:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch doubts' });
  }
};

export const answerDoubt = async (req, res) => {
  try {
    const { id } = req.params;
    const { solutionText, solutionAttachmentUrl } = req.body;

    if (!solutionText || solutionText.trim() === '') {
      return res.status(400).json({ success: false, error: 'Solution text is required' });
    }

    // Fetch the doubt and verify ownership
    const doubt = await doubtModel.getById(id, req.db);
    if (!doubt) {
      return res.status(404).json({ success: false, error: 'Doubt not found' });
    }

    // Security check: teacher can only answer doubts assigned specifically to them
    if (String(doubt.teacherId) !== String(req.user.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Security boundary violated: You can only reply to doubts assigned to you.'
      });
    }

    // Update reply details
    const updatedDoubt = await doubtModel.answerDoubt(id, {
      solutionText,
      solutionAttachmentUrl
    }, req.db);

    res.json({ success: true, data: updatedDoubt });
  } catch (err) {
    console.error('Error replying to doubt:', err);
    res.status(500).json({ success: false, error: 'Failed to answer doubt. Internal server error.' });
  }
};

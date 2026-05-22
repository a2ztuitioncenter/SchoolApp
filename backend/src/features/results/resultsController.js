import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

const checkTeacherClassPermission = async (db, teacherId, classLevel, section) => {
  try {
    // Check new subject_assignments table first
    const subjectRes = await db.query(
      `SELECT COUNT(*) as count FROM subject_assignments 
       WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL OR $3 IS NULL OR $3 = 'ALL')`,
      [teacherId, classLevel, section]
    );
    if (parseInt(subjectRes.rows[0].count, 10) > 0) return true;

    // Fallback to legacy teacher_class_assignment
    const result = await db.query(
      `SELECT COUNT(*) as count FROM teacher_class_assignment 
       WHERE teacher_id = $1 AND class_level = $2 AND (section = $3 OR section = 'ALL' OR section IS NULL OR $3 IS NULL OR $3 = 'ALL')`,
      [teacherId, classLevel, section]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (err) {
    console.error('Error checking class permission:', err);
    return false;
  }
};

export const getResultsByStudent = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { student } = req.params;
    const requesterId = req.user?.userId;
    const role = req.user?.role?.toLowerCase() || '';

    if (!schoolId) {
      console.warn('[getResultsByStudent] Missing schoolId in request');
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing school isolation key' });
    }

    let result;
    if (role === 'student') {
      // 1. Fetch student's own record to find their database ID, name, roll
      const studentRes = await req.db.query(
        `SELECT id, roll_number, name FROM students WHERE user_id = $1 AND school_id = $2`,
        [requesterId, schoolId]
      );
      const studentRecord = studentRes.rows[0];
      if (!studentRecord) {
        return res.status(403).json({ success: false, error: 'Forbidden: Student profile not found' });
      }

      // Check if student is trying to query someone else
      if (student !== 'all') {
        const isMatch = String(student) === String(studentRecord.id) || 
                        String(student).toLowerCase() === String(studentRecord.roll_number).toLowerCase() || 
                        String(student).toLowerCase() === String(studentRecord.name).toLowerCase();
        if (!isMatch) {
          return res.status(403).json({ success: false, error: 'Forbidden: You can only access your own results' });
        }
      } else {
        // Students are not authorized to query 'all' results
        return res.status(403).json({ success: false, error: 'Forbidden: You are not authorized to view all results' });
      }

      // Query ONLY their own results by student_id
      result = await req.db.query(
        `SELECT er.*, s.roll_number as roll_no
         FROM exam_results er
         LEFT JOIN students s ON er.student_id = s.id
         WHERE er.student_id = $1 AND er.school_id = $2
         ORDER BY er.created_at DESC`,
        [studentRecord.id, schoolId]
      );
    } else if (role === 'teacher' || role === 'staff') {
      if (student === 'all') {
        // Teachers query 'all' results but filtered by assigned classes and sections
        result = await req.db.query(
          `SELECT er.*, s.roll_number as roll_no
           FROM exam_results er
           LEFT JOIN students s ON er.student_id = s.id
           WHERE er.school_id = $1 AND (
             EXISTS (
               SELECT 1 FROM subject_assignments sa 
               WHERE sa.teacher_id = $2 AND sa.class_level = er.class_level 
                 AND (sa.section = 'ALL' OR sa.section IS NULL OR sa.section = er.section)
             ) OR EXISTS (
               SELECT 1 FROM teacher_class_assignment tca 
               WHERE tca.teacher_id = $2 AND tca.class_level = er.class_level 
                 AND (tca.section = 'ALL' OR tca.section IS NULL OR tca.section = er.section)
             )
           )
           ORDER BY er.created_at DESC`,
          [schoolId, requesterId]
        );
      } else {
        // Teachers query specific student results but filtered by assigned classes and sections
        result = await req.db.query(
          `SELECT er.*, s.roll_number as roll_no
           FROM exam_results er
           LEFT JOIN students s ON er.student_id = s.id
           WHERE (er.roll_number = $1 OR er.student_name = $1) 
             AND er.school_id = $2 AND (
               EXISTS (
                 SELECT 1 FROM subject_assignments sa 
                 WHERE sa.teacher_id = $3 AND sa.class_level = er.class_level 
                   AND (sa.section = 'ALL' OR sa.section IS NULL OR sa.section = er.section)
               ) OR EXISTS (
                 SELECT 1 FROM teacher_class_assignment tca 
                 WHERE tca.teacher_id = $3 AND tca.class_level = er.class_level 
                   AND (tca.section = 'ALL' OR tca.section IS NULL OR tca.section = er.section)
               )
             )
           ORDER BY er.created_at DESC`,
          [student, schoolId, requesterId]
        );
      }
    } else if (role === 'admin') {
      if (student === 'all') {
        result = await req.db.query(
          `SELECT er.*, s.roll_number as roll_no
           FROM exam_results er
           LEFT JOIN students s ON er.student_id = s.id
           WHERE er.school_id = $1
           ORDER BY er.created_at DESC`,
          [schoolId]
        );
      } else {
        result = await req.db.query(
          `SELECT er.*, s.roll_number as roll_no
           FROM exam_results er
           LEFT JOIN students s ON er.student_id = s.id
           WHERE (er.roll_number = $1 OR er.student_name = $1) AND er.school_id = $2
           ORDER BY er.created_at DESC`,
          [student, schoolId]
        );
      }
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Unauthorized role' });
    }

    if (!result || !result.rows) {
      return res.json({ success: true, data: [] });
    }

    const mappedData = result.rows.map(r => ({
      id: r.id,
      classLevel: r.class_level,
      section: r.section,
      rollNumber: r.roll_no || r.roll_number,
      studentName: r.student_name,
      examTitle: r.exam_title,
      subjects: typeof r.subjects === 'string' ? JSON.parse(r.subjects) : r.subjects,
      totalMarks: r.total_marks,
      obtainedMarks: r.obtained_marks,
      percentage: r.percentage,
      remarks: r.remarks,
      teacherId: r.teacher_id,
      studentId: r.student_id,
      createdAt: r.created_at
    }));

    res.json({ success: true, data: mappedData });
  } catch (err) {
    console.error('[getResultsByStudent] Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const createResult = async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase() || '';
    if (role === 'student') {
      return res.status(403).json({ success: false, error: 'Forbidden: Students are not authorized to create exam results' });
    }

    const classLevel = sanitizeText(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10) || 'A';
    const rollNumber = sanitizeText(req.body.rollNumber || req.body.roll_number, 20);
    const studentName = sanitizeText(req.body.studentName || req.body.student_name, 1000);
    const examTitle = sanitizeText(req.body.examTitle || req.body.exam_title, 200);
    const totalMarks = Number(req.body.totalMarks || req.body.total_marks) || 0;
    const obtainedMarks = Number(req.body.obtainedMarks || req.body.obtained_marks) || 0;
    const remarks = sanitizeNullableText(req.body.remarks, 500);
    const studentId = Number(req.body.studentId || req.body.student_id);
    const teacherId = sanitizeIdentifier(String(req.user?.userId || req.body.teacherId || req.body.teacher_id), 20);
    const schoolId = req.user.schoolId;

    if (!classLevel || !studentName || !examTitle)
      return res.status(400).json({ success: false, error: 'classLevel, studentName, and examTitle are required' });

    // For teachers/staff, verify class and section assignments
    if (role === 'teacher' || role === 'staff') {
      const hasPermission = await checkTeacherClassPermission(req.db, req.user.userId, classLevel, section);
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission for this class and section' });
      }
    }

    // Verify student exists and belongs to the specified class and section (and is in the same school)
    if (studentId) {
      const studentCheck = await req.db.query(
        `SELECT class_level, section, school_id FROM students WHERE id = $1`,
        [studentId]
      );
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }
      const student = studentCheck.rows[0];
      if (student.school_id !== schoolId) {
        return res.status(403).json({ success: false, error: 'Forbidden: School boundary mismatch' });
      }
      if (String(student.class_level) !== String(classLevel) || String(student.section || 'A') !== String(section || 'A')) {
        return res.status(400).json({ success: false, error: 'Student class/section mismatch' });
      }
    }

    const subjects = req.body.subjects || {};

    const result = await req.db.query(
      `INSERT INTO exam_results (class_level, section, roll_number, student_name, exam_title, subjects, total_marks, obtained_marks, percentage, remarks, teacher_id, student_id, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [classLevel, section, rollNumber, studentName, examTitle, JSON.stringify(subjects), totalMarks, obtainedMarks, (obtainedMarks / totalMarks * 100) || 0, remarks, teacherId, studentId, schoolId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('createResult:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

import express from 'express';
import { getUserByPhone, createUser, updateUser, deleteUser, toggleUserStatus, getTeacherAssignments, assignTeacherToClasses, countStudentsByPhone, getNonStudentByPhone, generateTeacherId, getUserById } from '../auth/User.js';
import { createStudent, getStudentsBySchool } from '../student/Student.js';
import { getPendingFees, getAllStudentFees, getFeesSummary } from '../fees/Fee.js';
import { getMonthlyOverallAttendance } from '../attendance/attendanceController.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Audit Log Helper
 */
const logAudit = async (db, userId, action, entity, entityId, details) => {
    try {
        await db.query(
            'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [userId, action, entity, entityId, details]
        );
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};

// ============================================================
// USERS MODULE
// ============================================================

router.get('/users', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT 
                u.id, u.name, u.phone, u.email, u.role, u.status, 
                u.teacher_id, u.is_active, u.created_at,
                COALESCE(
                    JSONB_AGG(
                        JSONB_BUILD_OBJECT('class', tca.class_level, 'section', tca.section)
                        ORDER BY tca.class_level
                    ) FILTER (WHERE tca.class_level IS NOT NULL),
                    '[]'::jsonb
                ) AS classes_assigned
            FROM users u
            LEFT JOIN teacher_class_assignment tca ON tca.teacher_id = u.id
            WHERE u.role IN ($1, $2)
            GROUP BY u.id
            ORDER BY u.created_at DESC`,
            ['teacher', 'staff']
        );

        const mapped = result.rows.map(u => ({
            id: u.id,
            name: u.name,
            phone: u.phone,
            email: u.email,
            role: u.role,
            status: u.status,
            teacherId: u.teacher_id,
            isActive: u.is_active,
            createdAt: u.created_at,
            classesAssigned: u.classes_assigned
        }));

        res.json({ success: true, data: mapped });
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch users', message: err.message });
    }
});

router.post('/users/create', async (req, res) => {
    const { name, phone, email, role, password, username } = req.body;
    try {
        if (!name || !phone || !role || !password) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        if (role !== 'student') {
            if (await getUserByPhone(req.db, phone)) return res.status(409).json({ success: false, error: 'Phone already registered' });
        } else {
            const studentCount = await countStudentsByPhone(req.db, phone);
            if (studentCount >= 4) return res.status(409).json({ success: false, error: 'Maximum 4 students can register with the same phone number' });
            if (await getNonStudentByPhone(req.db, phone)) return res.status(409).json({ success: false, error: 'Phone already registered to a non-student account' });
        }
        let teacherId = null;
        if (role === 'teacher' || role === 'staff') {
            teacherId = await generateTeacherId(req.db, role);
        }

        const user = await createUser(req.db, { name, phone, email, password, role, schoolId: req.user.schoolId || 'school-001', username, status: 'active', teacherId });
        
        await logAudit(req.db, req.user.userId, 'CREATE_USER', 'users', user.id, `Created ${role}: ${name}`);
        
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, role, classesAssigned } = req.body;
    try {
        const user = await updateUser(req.db, id, { name, phone, email, role });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        if ((role === 'teacher' || role === 'staff') && classesAssigned) {
            await assignTeacherToClasses(req.db, id, classesAssigned, user.schoolId || req.user.schoolId || 'school-001');
        }
        
        await logAudit(req.db, req.user.userId, 'UPDATE_USER', 'users', id, `Updated info for ${user.name}`);
        
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/users/:id/assignments', async (req, res) => {
    try {
        const assignments = await getTeacherAssignments(req.db, req.params.id);
        res.json({ success: true, data: assignments || [] });
    } catch (err) {
        console.error('Fetch assignments error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const deleted = await deleteUser(req.db, req.params.id);
        if (!deleted) return res.status(404).json({ success: false, error: 'User not found' });
        
        await logAudit(req.db, req.user.userId, 'DELETE_USER', 'users', req.params.id, `Deleted user ID ${req.params.id}`);
        
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.patch('/users/:id/status', async (req, res) => {
    try {
        const user = await toggleUserStatus(req.db, req.params.id, req.body.isActive);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('Toggle status error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// STUDENTS MODULE - Standardized & Atomic
// ============================================================

router.get('/students', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT s.*, u.phone as user_phone
             FROM students s 
             LEFT JOIN users u ON s.user_id = u.id 
             ORDER BY s.name ASC`
        );
        
        const mapped = result.rows.map(s => ({
            id: s.id,
            userId: s.user_id,
            name: s.name,
            classLevel: s.class_level,
            section: s.section,
            fatherName: s.father_name,
            motherName: s.mother_name,
            phone: s.phone,
            email: s.email,
            rollNumber: s.roll_number,
            joiningDate: s.joining_date,
            dateOfBirth: s.date_of_birth,
            status: s.status,
            schoolId: s.school_id,
            createdAt: s.created_at,
            userPhone: s.user_phone
        }));

        res.json({ success: true, data: mapped });
    } catch (err) {
        console.error('Fetch students error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch students', message: err.message });
    }
});

router.post('/students/create', async (req, res) => {
    const { firstName, lastName, phone, email, classLevel, section, fatherName, motherName, joiningDate, status, dateOfBirth } = req.body;
    const pool = req.db;
    try {
        if (!firstName || !phone || !classLevel || !section || !dateOfBirth || !fatherName || !motherName) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Parse DD/MM/YY -> ISO YYYY-MM-DD
        let dobISO;
        const parts = dateOfBirth.split('/');
        if (parts.length === 3) {
            const [dd, mm, yy] = parts;
            const pivotYear = (new Date().getFullYear() % 100) + 10;
            const year = yy.length === 2 ? (parseInt(yy) > pivotYear ? `19${yy}` : `20${yy}`) : yy;
            dobISO = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        } else {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use DD/MM/YY' });
        }

        const fullName = `${firstName} ${lastName || ''}`.trim();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const lockKey = parseInt(`${classLevel}${section.toUpperCase().charCodeAt(0)}`, 10);
            await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

            let user = await getUserByPhone(client, phone);
            if (!user) {
                user = await createUser(client, {
                    name: fullName,
                    phone,
                    email: email || null,
                    password: crypto.randomBytes(32).toString('hex'),
                    role: 'student'
                });
            }

            await client.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user.id]);

            const classPart = classLevel.toString().padStart(2, '0');
            const sectionPart = section.toUpperCase();
            const prefix = `${classPart}${sectionPart}`;
            const maxResult = await client.query(
                `SELECT MAX(CAST(SUBSTRING(roll_number, $2) AS INTEGER)) AS max_num
                 FROM students
                 WHERE roll_number ~ ('^' || $1 || '[0-9]{3}$')`,
                [prefix, (prefix.length + 1).toString()]
            );
            const nextNum = (maxResult.rows[0].max_num || 0) + 1;
            const rollNumber = `${prefix}${nextNum.toString().padStart(3, '0')}`;

            const student = await createStudent(client, {
                userId: user.id,
                name: fullName,
                classLevel: classLevel.toString(),
                section,
                fatherName,
                motherName,
                phone,
                email: email || null,
                joiningDate: joiningDate || new Date().toISOString().split('T')[0],
                dateOfBirth: dobISO,
                status: status || 'active',
                rollNumber
            });

            await logAudit(client, req.user.userId, 'CREATE_STUDENT', 'students', student.id, `Enrolled student: ${fullName}`);

            await client.query('COMMIT');
            res.status(201).json({ success: true, data: student });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[STUDENT CREATE] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/students/:id', async (req, res) => {
    const { id } = req.params;
    const { name, classLevel, section, fatherName, motherName, phone, email } = req.body;
    try {
        const result = await req.db.query(
            `UPDATE students 
             SET name = COALESCE($1, name),
                 class_level = COALESCE($2, class_level),
                 section = COALESCE($3, section),
                 father_name = COALESCE($4, father_name),
                 mother_name = COALESCE($5, mother_name),
                 phone = COALESCE($6, phone),
                 email = COALESCE($7, email)
             WHERE id = $8 RETURNING *`,
            [name, classLevel, section, fatherName, motherName, phone, email, id]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Student not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update student error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.patch('/students/:id/status', async (req, res) => {
    try {
        const result = await req.db.query(
            `UPDATE students SET status = $1 WHERE id = $2 RETURNING *`,
            [req.body.status, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Student not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update student status error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/students/:id', async (req, res) => {
    try {
        const studentResult = await req.db.query('SELECT user_id FROM students WHERE id = $1', [req.params.id]);
        if (studentResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Student not found' });
        const deleted = await deleteUser(req.db, studentResult.rows[0].user_id);
        if (!deleted) return res.status(404).json({ success: false, error: 'Associated user not found' });
        res.json({ success: true, message: 'Student deleted' });
    } catch (err) {
        console.error('Delete student error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// FINANCIALS
// ============================================================

router.get('/financials/unpaid-fees', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT 
                f.id, f.amount, f.due_date, f.is_paid,
                s.name as student_name,
                s.class_level,
                s.section,
                u.phone
             FROM fees f
             JOIN students s ON f.student_id = s.id
             JOIN users u ON s.user_id = u.id
             WHERE f.is_paid = FALSE
             ORDER BY f.due_date ASC`
        );
        
        const mapped = result.rows.map(f => ({
            id: f.id,
            amount: f.amount,
            dueDate: f.due_date,
            isPaid: f.is_paid,
            paid: f.is_paid,
            studentName: f.student_name,
            classLevel: f.class_level,
            section: f.section,
            phone: f.phone
        }));

        res.json({ success: true, data: mapped });
    } catch (err) {
        console.error('Fetch unpaid fees error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch unpaid fees', message: err.message });
    }
});

router.get('/financials/report', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT 
                COUNT(*) as total_records,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN is_paid = TRUE THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN is_paid = FALSE THEN amount ELSE 0 END), 0) as total_pending
            FROM fees`
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Financial report error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate report', message: err.message });
    }
});

router.get('/financials/trends', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const result = await req.db.query(
            `SELECT 
                DATE(created_at) as date,
                COALESCE(SUM(amount), 0) as amount
             FROM fees
             WHERE is_paid = TRUE AND created_at >= $1
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [thirtyDaysAgo]
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error('Financial trends error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch trends', message: err.message });
    }
});

// ============================================================
// TIMETABLE
// ============================================================

router.get('/timetable', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT t.id, t.day_of_week, t.start_time, t.end_time, 
                    t.subject_id, s.name as subject, 
                    t.class_level, t.section, t.teacher_id, u.name as teacher_name
             FROM timetable t
             LEFT JOIN users u ON t.teacher_id = u.id
             LEFT JOIN subjects s ON t.subject_id = s.id
             ORDER BY t.day_of_week, t.start_time ASC`
        );
        
        const mapped = result.rows.map(t => ({
            id: t.id,
            dayOfWeek: t.day_of_week,
            startTime: t.start_time,
            endTime: t.end_time,
            subjectId: t.subject_id,
            subject: t.subject,
            classLevel: t.class_level,
            section: t.section,
            teacherId: t.teacher_id,
            teacherName: t.teacher_name
        }));

        res.json({ success: true, data: mapped });
    } catch (err) {
        console.error('Fetch timetable error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch timetable', message: err.message });
    }
});

router.post('/timetable', async (req, res) => {
    const { dayOfWeek, startTime, endTime, subjectId, classLevel, section, teacherId } = req.body;
    try {
        const result = await req.db.query(
            `INSERT INTO timetable (day_of_week, start_time, end_time, subject_id, class_level, section, teacher_id, school_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [dayOfWeek, startTime, endTime, subjectId, classLevel, section, teacherId, 'school-001']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Create timetable error:', err);
        res.status(500).json({ success: false, error: 'Failed to create timetable entry', message: err.message });
    }
});

router.delete('/timetable/:id', async (req, res) => {
    try {
        await req.db.query('DELETE FROM timetable WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Timetable entry deleted' });
    } catch (err) {
        console.error('Delete timetable error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete timetable', message: err.message });
    }
});

router.get('/attendance/overall-monthly', getMonthlyOverallAttendance);

// ============================================================
// DYNAMIC DROPDOWNS (ERP GRADE)
// ============================================================

/**
 * GET /api/admin/classes
 * Returns distinct class levels currently in the students table
 */
router.get('/classes', async (req, res) => {
    try {
        const result = await req.db.query(
            "SELECT DISTINCT class_level FROM students WHERE class_level IS NOT NULL AND class_level != '' ORDER BY class_level ASC"
        );
        res.json({ success: true, data: result.rows.map(r => r.class_level) });
    } catch (err) {
        console.error('Fetch classes error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch classes' });
    }
});

/**
 * GET /api/admin/sections?classLevel=X
 * Returns distinct sections for a specific class level
 */
router.get('/sections', async (req, res) => {
    const { classLevel } = req.query;
    if (!classLevel) return res.status(400).json({ success: false, error: 'classLevel is required' });
    
    try {
        const result = await req.db.query(
            "SELECT DISTINCT section FROM students WHERE class_level = $1 AND section IS NOT NULL AND section != '' ORDER BY section ASC",
            [classLevel]
        );
        res.json({ success: true, data: result.rows.map(r => r.section) });
    } catch (err) {
        console.error('Fetch sections error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch sections' });
    }
});

/**
 * GET /api/admin/teachers-by-class?classLevel=X&section=Y
 * Returns teachers assigned to a specific class/section
 */
router.get('/teachers-by-class', async (req, res) => {
    const { classLevel, section } = req.query;
    if (!classLevel) return res.status(400).json({ success: false, error: 'classLevel is required' });

    try {
        let query = `
            SELECT DISTINCT u.id, u.name 
            FROM users u
            JOIN teacher_class_assignment tca ON u.id = tca.teacher_id
            WHERE tca.class_level = $1
        `;
        const params = [classLevel];
        
        if (section && section !== 'ALL') {
            query += " AND (tca.section = $2 OR tca.section = 'ALL')";
            params.push(section);
        }

        const result = await req.db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch teachers by class error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
    }
});


// ============================================================
// PROFILE & ORGANIZATION MODULE
// ============================================================

router.get('/profile', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar_url, u.last_login_at, u.designation,
                    o.name as organization_name, o.logo_url as organization_logo
             FROM users u
             LEFT JOIN organizations o ON u.school_id = o.id
             WHERE u.id = $1
             LIMIT 1`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Profile not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Fetch profile error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
});

router.put('/profile', async (req, res) => {
    const { name, email, avatar_url, designation } = req.body;
    try {
        const result = await req.db.query(
            `UPDATE users 
             SET name = COALESCE($2, name), 
                 email = COALESCE($3, email), 
                 avatar_url = COALESCE($4, avatar_url),
                 designation = COALESCE($5, designation)
             WHERE id = $1 RETURNING *`,
            [req.user.userId, name, email, avatar_url, designation]
        );
        
        await logAudit(req.db, req.user.userId, 'UPDATE_PROFILE', 'users', req.user.userId, 'Updated personal profile details');
        
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

router.get('/organization', async (req, res) => {
    try {
        const result = await req.db.query('SELECT * FROM organizations LIMIT 1');
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Fetch organization error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch organization' });
    }
});

router.get('/audit-logs', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT a.*, u.name as admin_name 
             FROM audit_logs a
             JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC LIMIT 50`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch audit logs error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
});

// ============================================================
// CONTENT PAGES MODULE
// ============================================================

const VALID_CONTENT_KEYS = ['help', 'documentation', 'programs', 'resources', 'contact', 'privacy', 'learn-more', 'terms'];

// GET all content pages (list)
router.get('/content', async (req, res) => {
    try {
        const result = await req.db.query(
            'SELECT id, key, content, updated_at FROM content_pages ORDER BY key ASC'
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch all content error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch content pages' });
    }
});

// GET single content page by key
router.get('/content/:key', async (req, res) => {
    const { key } = req.params;
    if (!VALID_CONTENT_KEYS.includes(key)) {
        return res.status(400).json({ success: false, error: 'Invalid content key' });
    }
    try {
        const result = await req.db.query(
            'SELECT key, content, updated_at FROM content_pages WHERE key = $1',
            [key]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Fetch content error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
});

// CREATE or UPDATE content page
router.put('/content/:key', async (req, res) => {
    const { key } = req.params;
    const { content, title } = req.body;
    if (!VALID_CONTENT_KEYS.includes(key)) {
        return res.status(400).json({ success: false, error: 'Invalid content key' });
    }
    if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Content must be a string' });
    }
    try {
        const result = await req.db.query(
            `INSERT INTO content_pages (key, content, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW()
             RETURNING id, key, content, updated_at`,
            [key, content]
        );
        await logAudit(req.db, req.user.userId, 'UPDATE_CONTENT', 'content_pages', key, `Updated "${key}" page content`);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update content error:', err);
        res.status(500).json({ success: false, error: 'Failed to update content' });
    }
});

// DELETE content page (reset to empty)
router.delete('/content/:key', async (req, res) => {
    const { key } = req.params;
    if (!VALID_CONTENT_KEYS.includes(key)) {
        return res.status(400).json({ success: false, error: 'Invalid content key' });
    }
    try {
        await req.db.query(
            `UPDATE content_pages SET content = '', updated_at = NOW() WHERE key = $1`,
            [key]
        );
        await logAudit(req.db, req.user.userId, 'DELETE_CONTENT', 'content_pages', key, `Cleared "${key}" page content`);
        res.json({ success: true, message: `Content for "${key}" cleared.` });
    } catch (err) {
        console.error('Delete content error:', err);
        res.status(500).json({ success: false, error: 'Failed to clear content' });
    }
});

export default router;
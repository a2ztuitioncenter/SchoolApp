import express from 'express';
import { getUserByPhone, createUser, updateUser, deleteUser, toggleUserStatus, getTeacherAssignments, assignTeacherToClasses, countStudentsByPhone, getNonStudentByPhone, generateTeacherId, getUserById } from '../auth/User.js';
import { createStudent, getStudentsBySchool } from '../student/Student.js';
import { getPendingFees, getAllStudentFees, getFeesSummary } from '../fees/Fee.js';
import { getMonthlyOverallAttendance } from '../attendance/attendanceController.js';
import crypto from 'crypto';

const router = express.Router();

// Fallback middleware for existing sessions without schoolId in token
router.use((req, res, next) => {
    if (req.user && !req.user.schoolId) {
        return res.status(401).json({ success: false, error: 'Session missing schoolId. Please re-authenticate.' });
    }
    next();
});

/**
 * Safe JSON Parser Utility
 * Prevents double-parsing, double-stringification, and handles malformed inputs gracefully.
 */
const safeJsonParse = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    
    try {
        // Attempt single parse
        const parsed = JSON.parse(value);
        // If the result is still a string (could be double stringified), parse again once
        if (typeof parsed === 'string') {
            try {
                return JSON.parse(parsed);
            } catch {
                return parsed;
            }
        }
        return parsed;
    } catch {
        return value;
    }
};

/**
 * Audit Log Helper - Production Safe & Tenant Scoped
 */
const logAudit = async (db, userId, action, entity, entityId, details, schoolId) => {
    try {
        if (!schoolId) {
            console.warn(`[AuditLog] Missing schoolId for action: ${action} by user: ${userId}`);
        }

        const detailsJson = typeof details === 'object' ? JSON.stringify(details) : JSON.stringify({ message: details });

        await db.query(
            'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, school_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, action, entity, entityId, detailsJson, schoolId || null]
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
            WHERE u.role IN ($1, $2) AND u.school_id = $3
            GROUP BY u.id
            ORDER BY u.created_at DESC`,
            ['teacher', 'staff', req.user.schoolId]
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
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
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
        if (email) {
            const emailCheck = await req.db.query('SELECT id FROM users WHERE email = $1', [email]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ success: false, error: 'Email already registered' });
            }
        }
        let teacherId = null;
        if (role === 'teacher' || role === 'staff') {
            teacherId = await generateTeacherId(req.db, role);
        }

        const user = await createUser(req.db, { name, phone, email, password, role, schoolId: req.user.schoolId, username, status: 'active', teacherId });
        
        await logAudit(req.db, req.user.userId, 'CREATE_USER', 'users', user.id, `Created ${role}: ${name}`, req.user.schoolId);
        
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, role, classesAssigned } = req.body;
    try {
        // Check email uniqueness if email is being changed
        if (email) {
            const emailCheck = await req.db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, id]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ success: false, error: 'Email is already in use by another user' });
            }
        }

        const user = await updateUser(req.db, id, { name, phone, email, role }, req.user.schoolId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        const schoolId = user.schoolId || req.user.schoolId;
        if ((role === 'teacher' || role === 'staff') && classesAssigned) {
            if (!schoolId) {
                return res.status(400).json({ success: false, error: 'School ID is missing. Cannot assign classes.' });
            }
            await assignTeacherToClasses(req.db, id, classesAssigned, schoolId);
        }
        
        await logAudit(req.db, req.user.userId, 'UPDATE_USER', 'users', id, `Updated info for ${user.name}`, req.user.schoolId);
        
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/users/:id/assignments', async (req, res) => {
    try {
        const assignments = await getTeacherAssignments(req.db, req.params.id);
        
        // Security check: ensure teacher belongs to the same school
        const teacher = await getUserById(req.db, req.params.id);
        if (!teacher || teacher.school_id !== req.user.schoolId) {
            return res.status(403).json({ success: false, error: 'Unauthorized: Teacher belongs to another school' });
        }

        res.json({ success: true, data: assignments || [] });
    } catch (err) {
        console.error('Fetch assignments error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const deleted = await deleteUser(req.db, req.params.id, req.user.schoolId);
        if (!deleted) return res.status(404).json({ success: false, error: 'User not found' });
        
        await logAudit(req.db, req.user.userId, 'DELETE_USER', 'users', req.params.id, `Deleted user ID ${req.params.id}`, req.user.schoolId);
        
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.patch('/users/:id/status', async (req, res) => {
    try {
        const user = await toggleUserStatus(req.db, req.params.id, req.body.isActive, req.user.schoolId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('Toggle status error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
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
             WHERE s.school_id = $1
             ORDER BY s.name ASC`,
            [req.user.schoolId]
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
        res.status(500).json({ success: false, error: 'Failed to fetch students' });
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
            
            // Semantic validation
            const parsedDate = new Date(dobISO);
            if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dobISO) {
                return res.status(400).json({ success: false, error: 'Invalid date of birth' });
            }
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

            if (user.status === 'blocked') {
                await client.query('ROLLBACK');
                return res.status(403).json({ success: false, error: 'Cannot enroll student: Associated user account is blocked' });
            }
            if (user.status !== 'active') {
                await client.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user.id]);
            }

            // Check for duplicate enrollment
            const existingStudent = await client.query(
                'SELECT id FROM students WHERE user_id = $1 AND class_level = $2 AND section = $3 AND school_id = $4',
                [user.id, classLevel.toString(), section, req.user.schoolId]
            );
            if (existingStudent.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ success: false, error: 'Student already enrolled in this class/section' });
            }

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
                rollNumber,
                schoolId: req.user.schoolId
            });

            await logAudit(client, req.user.userId, 'CREATE_STUDENT', 'students', student.id, `Enrolled student: ${fullName}`, req.user.schoolId);

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
        res.status(500).json({ success: false, error: 'Internal server error' });
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
             WHERE id = $8 AND school_id = $9 RETURNING *`,
            [name, classLevel, section, fatherName, motherName, phone, email, id, req.user.schoolId]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Student not found' });
        
        await logAudit(req.db, req.user.userId, 'UPDATE_STUDENT', 'students', id, `Updated student: ${name || result.rows[0].name}`, req.user.schoolId);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update student error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.patch('/students/:id/status', async (req, res) => {
    try {
        const result = await req.db.query(
            `UPDATE students SET status = $1 WHERE id = $2 AND school_id = $3 RETURNING *`,
            [req.body.status, req.params.id, req.user.schoolId]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Student not found' });
        
        await logAudit(req.db, req.user.userId, 'UPDATE_STUDENT_STATUS', 'students', req.params.id, `Changed status to ${req.body.status}`, req.user.schoolId);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update student status error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.delete('/students/:id', async (req, res) => {
    const client = await req.db.connect();
    try {
        const studentId = req.params.id;
        await client.query('BEGIN');

        const studentResult = await client.query('SELECT user_id FROM students WHERE id = $1 AND school_id = $2 FOR UPDATE', [studentId, req.user.schoolId]);
        if (studentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        const userId = studentResult.rows[0].user_id;
        
        // 1. Delete the specific student record
        await client.query('DELETE FROM students WHERE id = $1', [studentId]);
        
        // 2. Check if other students share this user_id within the same transaction
        const sharedResult = await client.query('SELECT COUNT(*) as count FROM students WHERE user_id = $1', [userId]);
        const otherStudentsCount = parseInt(sharedResult.rows[0].count, 10);
        
        if (otherStudentsCount === 0) {
            // 3. No other students, safe to delete the user account
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
            await logAudit(client, req.user.userId, 'DELETE_STUDENT', 'students', studentId, { message: 'Deleted student and shared user account', userId, schoolId: req.user.schoolId }, req.user.schoolId);
            await client.query('COMMIT');
            res.json({ success: true, message: 'Student and associated user account deleted' });
        } else {
            // 4. Other students exist, commit student deletion but keep user
            await logAudit(client, req.user.userId, 'DELETE_STUDENT', 'students', studentId, { message: 'Deleted student record (user account preserved)', userId, schoolId: req.user.schoolId }, req.user.schoolId);
            await client.query('COMMIT');
            res.json({ success: true, message: 'Student record deleted (user account preserved for other students)' });
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete student error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
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
             WHERE f.is_paid = FALSE AND s.school_id = $1
             ORDER BY f.due_date ASC`,
            [req.user.schoolId]
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
        res.status(500).json({ success: false, error: 'Failed to fetch unpaid fees' });
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
            FROM fees f
            JOIN students s ON f.student_id = s.id
            WHERE s.school_id = $1`,
            [req.user.schoolId]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Financial report error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});

/**
 * GET /api/admin/financials/trends
 * Combined implementation with backward compatibility
 */
router.get('/financials/trends', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await req.db.query(
            `SELECT 
                DATE(COALESCE(f.paid_date, f.created_at)) as date,
                COALESCE(SUM(f.amount), 0) as amount
             FROM fees f
             JOIN students s ON f.student_id = s.id
             WHERE (f.status = 'paid' OR f.is_paid = TRUE) 
               AND (COALESCE(f.paid_date, f.created_at)) >= $1 
               AND s.school_id = $2
             GROUP BY DATE(COALESCE(f.paid_date, f.created_at))
             ORDER BY date ASC`,
            [thirtyDaysAgo, schoolId]
        );

        // Return both 'data' and 'trends' for backward compatibility with different frontend versions
        res.json({ 
            success: true, 
            data: result.rows || [], 
            trends: result.rows || [] 
        });
    } catch (err) {
        console.error('Financial trends error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch trends' });
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
             WHERE t.school_id = $1
             ORDER BY t.day_of_week, t.start_time ASC`,
            [req.user.schoolId]
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
        res.status(500).json({ success: false, error: 'Failed to fetch timetable' });
    }
});

router.post('/timetable', async (req, res) => {
    const { dayOfWeek, startTime, endTime, subjectId, classLevel, section, teacherId } = req.body;
    const normalizedSection = section || null;
    const client = await req.db.connect();

    try {
        await client.query('BEGIN');

        // 1. Serialize access to this specific timetable scope (Class + Section + Day) using an advisory lock
        const lockKey = `timetable_${req.user.schoolId}_${classLevel}_${normalizedSection}_${dayOfWeek}`;
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);

        // 2. Re-run overlap check inside the locked transaction
        const overlapResult = await client.query(
            `SELECT id FROM timetable 
             WHERE school_id = $1 AND class_level = $2 AND section = $3 AND day_of_week = $4 
             AND (
                (start_time <= $5 AND end_time > $5) OR 
                (start_time < $6 AND end_time >= $6) OR
                (start_time >= $5 AND end_time <= $6)
             )`,
            [req.user.schoolId, classLevel, normalizedSection, dayOfWeek, startTime, endTime]
        );

        if (overlapResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, error: 'Timetable entry overlaps with an existing one' });
        }

        // 3. Perform atomic insertion
        const result = await client.query(
            `INSERT INTO timetable (school_id, class_level, section, subject_id, teacher_id, day_of_week, start_time, end_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.user.schoolId, classLevel, normalizedSection, subjectId, teacherId, dayOfWeek, startTime, endTime]
        );

        await client.query('COMMIT');
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create timetable error:', err);
        res.status(500).json({ success: false, error: 'Failed to create timetable entry' });
    } finally {
        client.release();
    }
});

router.delete('/timetable/:id', async (req, res) => {
    try {
        const result = await req.db.query(
            'DELETE FROM timetable WHERE id = $1 AND school_id = $2 RETURNING id',
            [req.params.id, req.user.schoolId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Timetable entry not found' });
        }
        res.json({ success: true, message: 'Timetable entry deleted' });
    } catch (err) {
        console.error('Delete timetable error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete timetable' });
    }
});

router.get('/attendance/overall-monthly', getMonthlyOverallAttendance);

/**
 * GET /api/admin/stats/summary
 * Unified endpoint for dashboard KPI stats
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Run all count queries in parallel
        const [
            studentStats,
            userStats,
            financialStats,
            homeworkStats,
            attendanceStats
        ] = await Promise.all([
            // Student Counts
            req.db.query(
                `SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active
                 FROM students WHERE school_id = $1`,
                [schoolId]
            ),
            // User Counts
            req.db.query(
                `SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teachers,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
                 FROM users WHERE school_id = $1`,
                [schoolId]
            ),
            // Financials
            req.db.query(
                `SELECT 
                    COALESCE(SUM(CASE WHEN is_paid = TRUE THEN amount ELSE 0 END), 0) as paid,
                    COALESCE(SUM(CASE WHEN is_paid = FALSE THEN amount ELSE 0 END), 0) as pending,
                    COUNT(CASE WHEN is_paid = FALSE THEN 1 END) as unpaid_count
                 FROM fees f
                 JOIN students s ON f.student_id = s.id
                 WHERE s.school_id = $1`,
                [schoolId]
            ),
            // Homework (last 30 days)
            req.db.query(
                `SELECT COUNT(*) as total FROM homework WHERE school_id = $1 AND created_at >= $2`,
                [schoolId, thirtyDaysAgo]
            ),
            // Attendance (current month)
            req.db.query(
                `SELECT 
                    ROUND(COUNT(CASE WHEN is_present=true THEN 1 END) * 100.0 / NULLIF(COUNT(id), 0), 1) as percentage
                 FROM attendance
                 WHERE school_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
                [schoolId, currentMonth]
            )
        ]);

        res.json({
            success: true,
            data: {
                students: {
                    total: parseInt(studentStats.rows[0].total),
                    active: parseInt(studentStats.rows[0].active)
                },
                users: {
                    total: parseInt(userStats.rows[0].total),
                    teachers: parseInt(userStats.rows[0].teachers),
                    pending: parseInt(userStats.rows[0].pending)
                },
                financials: {
                    totalPaid: parseFloat(financialStats.rows[0].paid),
                    totalPending: parseFloat(financialStats.rows[0].pending),
                    unpaidCount: parseInt(financialStats.rows[0].unpaid_count)
                },
                homework: {
                    recentCount: parseInt(homeworkStats.rows[0].total)
                },
                attendance: {
                    monthlyRate: parseFloat(attendanceStats.rows[0].percentage) || 0
                }
            }
        });
    } catch (err) {
        console.error('Stats summary error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch summary stats' });
    }
});

// Route removed as it was a duplicate. Logic merged into primary /financials/trends endpoint above.


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
            "SELECT DISTINCT class_level FROM students WHERE school_id = $1 AND class_level IS NOT NULL AND class_level != '' ORDER BY class_level ASC",
            [req.user.schoolId]
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
            "SELECT DISTINCT section FROM students WHERE school_id = $2 AND class_level = $1 AND section IS NOT NULL AND section != '' ORDER BY section ASC",
            [classLevel, req.user.schoolId]
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
            WHERE tca.class_level = $1 AND tca.school_id = $2
        `;
        const params = [classLevel, req.user.schoolId];
        
        if (section && section !== 'ALL') {
            query += " AND (tca.section = $3 OR tca.section = 'ALL')";
            params.push(section);
        }

        const result = await req.db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch teachers by class error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
    }
});

/**
 * GET /api/admin/teachers
 * Returns all teachers in the school (scoped)
 */
router.get('/teachers', async (req, res) => {
    try {
        const result = await req.db.query(
            "SELECT id, name, teacher_id FROM users WHERE school_id = $1 AND role = 'teacher' AND status = 'active' ORDER BY name ASC",
            [req.user.schoolId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch all teachers error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
    }
});

/**
 * GET /api/admin/subjects
 * Returns all subjects in the school (scoped)
 */
router.get('/subjects', async (req, res) => {
    try {
        // Note: subjects table currently missing school_id, adding it in migration.
        // For now, we fetch all, but will be filtered after migration.
        const result = await req.db.query(
            "SELECT id, name, code FROM subjects WHERE school_id = $1 ORDER BY name ASC",
            [req.user.schoolId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch all subjects error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
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
             LEFT JOIN organizations o ON u.school_id = o.id::text
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
        // Check email uniqueness if email is being changed
        if (email) {
            const emailCheck = await req.db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, req.user.userId]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ success: false, error: 'Email is already in use' });
            }
        }

        const result = await req.db.query(
            `UPDATE users 
             SET name = COALESCE($2, name), 
                 email = COALESCE($3, email), 
                 avatar_url = COALESCE($4, avatar_url),
                 designation = COALESCE($5, designation)
             WHERE id = $1 RETURNING *`,
            [req.user.userId, name, email, avatar_url, designation]
        );
        
        await logAudit(req.db, req.user.userId, 'UPDATE_PROFILE', 'users', req.user.userId, 'Updated personal profile details', req.user.schoolId);
        
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

router.get('/organization', async (req, res) => {
    try {
        const result = await req.db.query('SELECT * FROM organizations WHERE id = $1', [req.user.schoolId]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, error: 'Organization not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Fetch organization error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch organization' });
    }
});

router.get('/audit-logs', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'School ID required for audit logs' });
        }
        const result = await req.db.query(
            `SELECT a.*, u.name as admin_name 
             FROM audit_logs a
             JOIN users u ON a.user_id = u.id
             WHERE a.school_id = $1
             ORDER BY a.created_at DESC LIMIT 50`,
            [schoolId]
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
            `SELECT key, content, updated_at FROM content_pages ORDER BY key ASC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch all content error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch content pages' });
    }
});

// GET single content page by key
router.get('/content/:key', async (req, res) => {
    const { key: rawKey } = req.params;
    const key = rawKey ? rawKey.trim() : '';
    
    if (!VALID_CONTENT_KEYS.includes(key)) {
        console.warn(`[AdminAPI] Invalid content key: "${key}" (raw: "${rawKey}")`);
        return res.status(400).json({ success: false, error: 'Invalid content key' });
    }
    try {
        const result = await req.db.query(
            `SELECT key, content, updated_at FROM content_pages WHERE key = $1`,
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
    const { content } = req.body;
    if (!VALID_CONTENT_KEYS.includes(key)) {
        return res.status(400).json({ success: false, error: 'Invalid content key' });
    }
    if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Content must be a string' });
    }
    try {
        const result = await req.db.query(
            `INSERT INTO content_pages (key, content)
             VALUES ($1, $2)
             ON CONFLICT (key) 
             DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
             RETURNING id, key, content, updated_at`,
            [key, content]
        );
        await logAudit(req.db, req.user.userId, 'UPDATE_CONTENT', 'content_pages', key, `Updated "${key}" page content`, req.user.schoolId);
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
        const result = await req.db.query(
            `UPDATE content_pages SET content = '', updated_at = NOW() WHERE key = $1`,
            [key]
        );
        await logAudit(req.db, req.user.userId, 'DELETE_CONTENT', 'content_pages', key, `Cleared "${key}" page content`, req.user.schoolId);
        res.json({ success: true, message: `Content for "${key}" cleared.` });
    } catch (err) {
        console.error('Delete content error:', err);
        res.status(500).json({ success: false, error: 'Failed to clear content' });
    }
});

export default router;

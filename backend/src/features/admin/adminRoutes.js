import express from 'express';
import { getUserByPhone, createUser, updateUser, deleteUser, toggleUserStatus, getTeacherAssignments, assignTeacherToClasses } from '../auth/User.js';
import { createStudent, getStudentsBySchool } from '../student/Student.js';
import { getPendingFees, getAllStudentFees, getFeesSummary } from '../fees/Fee.js';
import { getMonthlyOverallAttendance } from '../attendance/attendanceController.js';
import crypto from 'crypto';

const router = express.Router();

// ============================================================
// USERS MODULE
// ============================================================

router.get('/users', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT 
                u.id, u.name, u.phone, u.email, u.role, u.status, u.teacher_id, u.is_active, u.created_at,
                COALESCE(
                    ARRAY_REMOVE(ARRAY_AGG(tca.class_level ORDER BY tca.class_level), NULL),
                    ARRAY[]::varchar[]
                ) AS classes_assigned
             FROM users u
             LEFT JOIN teacher_class_assignment tca ON tca.teacher_id = u.id
             WHERE u.role IN ($1, $2)
             GROUP BY u.id
             ORDER BY u.created_at DESC`,
            ['teacher', 'staff']
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.post('/users/create', async (req, res) => {
    const { name, phone, email, role, password } = req.body;
    try {
        if (!name || !phone || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (await getUserByPhone(req.db, phone)) return res.status(409).json({ error: 'Phone already registered' });
        const user = await createUser(req.db, { name, phone, email, password, role, schoolId: 'school-001' });
        res.status(201).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, role, classesAssigned } = req.body;
    try {
        const user = await updateUser(req.db, id, { name, phone, email, role });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if ((role === 'teacher' || role === 'staff') && classesAssigned) {
            await assignTeacherToClasses(req.db, id, classesAssigned, user.school_id);
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/users/:id/assignments', async (req, res) => {
    try {
        const assignments = await getTeacherAssignments(req.db, req.params.id);
        res.json({ success: true, assignments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const deleted = await deleteUser(req.db, req.params.id);
        if (!deleted) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/users/:id/status', async (req, res) => {
    try {
        const user = await toggleUserStatus(req.db, req.params.id, req.body.isActive);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// STUDENTS MODULE - Standardized & Atomic
// ============================================================

router.get('/students', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT s.*, u.phone 
             FROM students s 
             LEFT JOIN users u ON s.user_id = u.id 
             ORDER BY s.name ASC`
        );
        res.json({ success: true, students: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

router.post('/students/create', async (req, res) => {
    const { firstName, lastName, phone, email, classLevel, section, fatherName, motherName, joiningDate, status, dateOfBirth } = req.body;
    const pool = req.db;
    try {
        if (!firstName || !phone || !classLevel || !section || !dateOfBirth || !fatherName || !motherName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Parse DD/MM/YY -> ISO YYYY-MM-DD
        let dobISO;
        const parts = dateOfBirth.split('/');
        if (parts.length === 3) {
            const [dd, mm, yy] = parts;
            const year = yy.length === 2 ? (parseInt(yy) > 30 ? `19${yy}` : `20${yy}`) : yy;
            dobISO = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        } else {
            return res.status(400).json({ error: 'Invalid date format. Use DD/MM/YY' });
        }

        const fullName = `${firstName} ${lastName || ''}`.trim();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            
            // LOCK TABLE for atomic roll number generation
            await client.query('LOCK TABLE students IN ACCESS EXCLUSIVE MODE');

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
            const countResult = await client.query(
                `SELECT COUNT(*) FROM students WHERE roll_number LIKE $1`,
                [`${prefix}%`]
            );
            const rollNumber = `${prefix}${(parseInt(countResult.rows[0].count) + 1).toString().padStart(3, '0')}`;

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

            await client.query('COMMIT');
            res.status(201).json({ success: true, student });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[STUDENT CREATE] Error:', err.message);
        res.status(500).json({ error: err.message });
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
        if (!result.rows[0]) return res.status(404).json({ error: 'Student not found' });
        res.json({ success: true, student: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/students/:id/status', async (req, res) => {
    try {
        const result = await req.db.query(
            `UPDATE students SET status = $1 WHERE id = $2 RETURNING *`,
            [req.body.status, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Student not found' });
        res.json({ success: true, student: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/students/:id', async (req, res) => {
    try {
        const studentResult = await req.db.query('SELECT user_id FROM students WHERE id = $1', [req.params.id]);
        if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        const deleted = await deleteUser(req.db, studentResult.rows[0].user_id);
        if (!deleted) return res.status(404).json({ error: 'Associated user not found' });
        res.json({ success: true, message: 'Student deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// FINANCIALS
// ============================================================

router.get('/financials/unpaid-fees', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT 
                f.id, f.amount, f.due_date, f.is_paid AS paid,
                s.name as student_name,
                s.class_level,
                u.phone
             FROM fees f
             JOIN students s ON f.student_id = s.id
             JOIN users u ON s.user_id = u.id
             WHERE f.is_paid = FALSE
             ORDER BY f.due_date ASC`
        );
        res.json({ success: true, fees: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch unpaid fees' });
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
        res.json({ success: true, report: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate report' });
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
        res.json({ success: true, trends: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
});

// ============================================================
// TIMETABLE
// ============================================================

router.get('/timetable', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT t.*, u.name as teacher_name 
             FROM timetable t
             LEFT JOIN users u ON t.teacher_id = u.id
             ORDER BY t.day_of_week, t.start_time ASC`
        );
        res.json({ success: true, timetable: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
});

router.post('/timetable', async (req, res) => {
    const { dayOfWeek, startTime, endTime, subject, classLevel, section, teacherId } = req.body;
    try {
        const result = await req.db.query(
            `INSERT INTO timetable (day_of_week, start_time, end_time, subject, class_level, section, teacher_id, school_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [dayOfWeek, startTime, endTime, subject, classLevel, section, teacherId, 'school-001']
        );
        res.status(201).json({ success: true, timetable: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create timetable entry' });
    }
});

router.delete('/timetable/:id', async (req, res) => {
    try {
        await req.db.query('DELETE FROM timetable WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete timetable' });
    }
});

router.get('/attendance/overall-monthly', getMonthlyOverallAttendance);

export default router;

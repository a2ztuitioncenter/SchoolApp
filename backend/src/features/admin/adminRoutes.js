import express from 'express';
import { getUserByPhone, createUser, updateUser, deleteUser, toggleUserStatus, getTeacherAssignments, assignTeacherToClasses, countStudentsByPhone, getNonStudentByPhone, generateTeacherId } from '../auth/User.js';
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
                u.id, u.name, u.phone, u.email, u.role, u.status, 
                u."teacherId", u."isActive", u."createdAt",
                COALESCE(
                    JSONB_AGG(
                        JSONB_BUILD_OBJECT('class', tca."classLevel", 'section', tca.section)
                        ORDER BY tca."classLevel"
                    ) FILTER (WHERE tca."classLevel" IS NOT NULL),
                    '[]'::jsonb
                ) AS "classesAssigned"
             FROM users u
             LEFT JOIN teacher_class_assignment tca ON tca."teacherId" = u.id
             WHERE u.role IN ($1, $2)
             GROUP BY u.id
             ORDER BY u."createdAt" DESC`,
            ['teacher', 'staff']
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.post('/users/create', async (req, res) => {
    const { name, phone, email, role, password, username } = req.body;
    try {
        if (!name || !phone || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Phone uniqueness: strict for non-students, allow up to 4 for students
        if (role !== 'student') {
            if (await getUserByPhone(req.db, phone)) return res.status(409).json({ error: 'Phone already registered' });
        } else {
            const studentCount = await countStudentsByPhone(req.db, phone);
            if (studentCount >= 4) return res.status(409).json({ error: 'Maximum 4 students can register with the same phone number' });
            if (await getNonStudentByPhone(req.db, phone)) return res.status(409).json({ error: 'Phone already registered to a non-student account' });
        }
        let teacherId = null;
        if (role === 'teacher' || role === 'staff') {
            teacherId = await generateTeacherId(req.db, role);
        }

        const user = await createUser(req.db, { name, phone, email, password, role, schoolId: 'school-001', username, status: 'active', teacherId });
        res.status(201).json({ success: true, data: user });
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
            await assignTeacherToClasses(req.db, id, classesAssigned, user.schoolId);
        }
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/users/:id/assignments', async (req, res) => {
    try {
        const assignments = await getTeacherAssignments(req.db, req.params.id);
        res.json({ success: true, data: assignments });
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
        res.json({ success: true, data: user });
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
            `SELECT s.id, s."userId", s.name, s."classLevel", s.section, 
                    s."fatherName", s."motherName", s.phone, s.email, 
                    s."rollNumber", s."joiningDate", s."dateOfBirth", 
                    s.status, s."schoolId", s."createdAt", u.phone as "userPhone"
             FROM students s 
             LEFT JOIN users u ON s."userId" = u.id 
             ORDER BY s.name ASC`
        );
        res.json({ success: true, data: result.rows });
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
            res.status(201).json({ success: true, data: student });
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
                 "classLevel" = COALESCE($2, "classLevel"),
                 section = COALESCE($3, section),
                 "fatherName" = COALESCE($4, "fatherName"),
                 "motherName" = COALESCE($5, "motherName"),
                 phone = COALESCE($6, phone),
                 email = COALESCE($7, email)
             WHERE id = $8 RETURNING *`,
            [name, classLevel, section, fatherName, motherName, phone, email, id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Student not found' });
        res.json({ success: true, data: result.rows[0] });
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
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/students/:id', async (req, res) => {
    try {
        const studentResult = await req.db.query('SELECT "userId" FROM students WHERE id = $1', [req.params.id]);
        if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        const deleted = await deleteUser(req.db, studentResult.rows[0].userId);
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
                f.id, f.amount, f."dueDate", f."isPaid" AS paid,
                s.name as student_name,
                s."classLevel",
                u.phone
             FROM fees f
             JOIN students s ON f."studentId" = s.id
             JOIN users u ON s."userId" = u.id
             WHERE f."isPaid" = FALSE
             ORDER BY f."dueDate" ASC`
        );
        res.json({ success: true, data: result.rows });
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
                COALESCE(SUM(CASE WHEN "isPaid" = TRUE THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN "isPaid" = FALSE THEN amount ELSE 0 END), 0) as total_pending
             FROM fees`
        );
        res.json({ success: true, data: result.rows[0] });
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
                DATE("createdAt") as date,
                COALESCE(SUM(amount), 0) as amount
             FROM fees
             WHERE "isPaid" = TRUE AND "createdAt" >= $1
             GROUP BY DATE("createdAt")
             ORDER BY date ASC`,
            [thirtyDaysAgo]
        );
        res.json({ success: true, data: result.rows });
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
            `SELECT t.id, t."dayOfWeek", t."startTime", t."endTime", t.subject, 
                    t."classLevel", t.section, t."teacherId", u.name as "teacherName"
             FROM timetable t
             LEFT JOIN users u ON t."teacherId" = u.id
             ORDER BY t."dayOfWeek", t."startTime" ASC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
});

router.post('/timetable', async (req, res) => {
    const { dayOfWeek, startTime, endTime, subject, classLevel, section, teacherId } = req.body;
    try {
        const result = await req.db.query(
            `INSERT INTO timetable ("dayOfWeek", "startTime", "endTime", subject, "classLevel", section, "teacherId", "schoolId")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [dayOfWeek, startTime, endTime, subject, classLevel, section, teacherId, 'school-001']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
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

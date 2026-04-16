import express from 'express';
import { getUserByPhone, createUser, updateUser, deleteUser, toggleUserStatus, getTeacherAssignments, assignTeacherToClasses } from '../auth/User.js';
import { createStudent, getStudentsBySchool } from '../student/Student.js';
import { getPendingFees, getAllStudentFees, getFeesSummary } from '../fees/Fee.js';
import { getMonthlyOverallAttendance } from '../attendance/attendanceController.js';

const router = express.Router();

// ============================================================
// USERS MODULE
// ============================================================

router.get('/users', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT 
                u.id, u.name, u.phone, u.email, u.role, u.status, u."teacherId", u."isActive", u."createdAt",
                COALESCE(
                    ARRAY_REMOVE(ARRAY_AGG(tca."classLevel" ORDER BY tca."classLevel"), NULL),
                    ARRAY[]::varchar[]
                ) AS "classesAssigned"
             FROM users u
             LEFT JOIN teacher_class_assignment tca ON tca."teacherId" = u.id
             WHERE u.role IN ($1, $2)
             GROUP BY u.id
             ORDER BY u."createdAt" DESC`,
            ['teacher', 'staff']
        );

        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.post('/users/create', async (req, res) => {
    const { name, phone, email, role, password } = req.body;
    try {
        console.log('[USER CREATE] Processing:', { name, phone, role });
        if (!name || !phone || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields: name, phone, role, password' });
        }
        const exists = await getUserByPhone(req.db, phone);
        if (exists) return res.status(409).json({ error: 'Phone already registered' });
        console.log('[USER CREATE] Calling createUser...');
        const user = await createUser(req.db, { name, phone, email, password, role, schoolId: 'school-001' });
        console.log('[USER CREATE] User created:', { id: user.id, name: user.name, phone: user.phone });
        res.status(201).json({ success: true, user });
    } catch (err) {
        console.error('[USER CREATE] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { phone, email, role, classesAssigned } = req.body;
    try {
        const user = await updateUser(req.db, id, { phone, email, role });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Handle teacher/staff class assignments if role is teacher/staff
        if ((role === 'teacher' || role === 'staff') && classesAssigned) {
            await assignTeacherToClasses(req.db, id, classesAssigned, user.schoolId);
        }
        
        res.json({ success: true, user });
    } catch (err) {
        console.error('[USER UPDATE] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/users/:id/assignments', async (req, res) => {
    const { id } = req.params;
    try {
        const assignments = await getTeacherAssignments(req.db, id);
        res.json({ success: true, assignments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await deleteUser(req.db, id);
        if (!deleted) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/users/:id/status', async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
        const user = await toggleUserStatus(req.db, id, isActive);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// STUDENTS MODULE
// ============================================================

router.get('/students', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT s.*, u.phone 
             FROM students s 
             LEFT JOIN users u ON s."userId" = u.id 
             ORDER BY s.name ASC`
        );
        res.json({ success: true, students: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

router.post('/students/create', async (req, res) => {
    const { firstName, lastName, phone, email, classLevel, section, fatherName, motherName, joiningDate, status, dateOfBirth } = req.body;
    try {
        if (!firstName || !phone || !classLevel || !section || !dateOfBirth || !fatherName || !motherName) {
            return res.status(400).json({ error: 'Missing required fields (Name, Phone, Class, Section, Date of Birth, and Parent Names are mandatory)' });
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

        // 1. Handle User Creation — store a random dummy password (DOB is the real auth factor)
        let user = await getUserByPhone(req.db, phone);
        if (!user) {
            const crypto = await import('crypto');
            const dummyPassword = crypto.randomBytes(32).toString('hex');
            user = await createUser(req.db, {
                name: fullName,
                phone,
                email: email || null,
                password: dummyPassword,
                role: 'student'
            });
        }

        // Auto-approve student added by admin
        await req.db.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user.id]);

        // 2. Generate Unique Roll Number: format 09A001
        const classPart = classLevel.toString().padStart(2, '0');
        const sectionPart = section.toUpperCase();
        const prefix = `${classPart}${sectionPart}`;
        const countResult = await req.db.query(
            `SELECT COUNT(*) FROM students WHERE "rollNumber" LIKE $1`,
            [`${prefix}%`]
        );
        const nextSerial = parseInt(countResult.rows[0].count) + 1;
        const rollNumber = `${prefix}${nextSerial.toString().padStart(3, '0')}`;

        // 3. Create Student record with DOB
        const student = await createStudent(req.db, {
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

        res.status(201).json({ success: true, student });
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
        res.json({ success: true, student: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/students/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'inactive'
    try {
        const result = await req.db.query(
            `UPDATE students SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Student not found' });
        res.json({ success: true, student: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // First get the userId for this student
        const studentResult = await req.db.query('SELECT "userId" FROM students WHERE id = $1', [id]);
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const userId = studentResult.rows[0].userId;
        
        // Delete the user record using the model helper (handles manual cleanup)
        const deleted = await deleteUser(req.db, userId);
        
        if (!deleted) return res.status(404).json({ error: 'Associated user not found' });
        res.json({ success: true, message: 'Student and associated user account deleted' });
    } catch (err) {
        console.error('[STUDENT DELETE] Error:', err.message);
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
                s.name as "studentName",
                s."classLevel",
                u.phone
             FROM fees f
             JOIN students s ON f."studentId" = s.id
             JOIN users u ON s."userId" = u.id
             WHERE f."isPaid" = FALSE
             ORDER BY f."dueDate" ASC`
        );
        res.json({ success: true, fees: result.rows });
    } catch (err) {
        console.error('unpaid-fees error:', err.message);
        res.status(500).json({ error: 'Failed to fetch unpaid fees', detail: err.message });
    }
});

router.get('/financials/report', async (req, res) => {
    try {
        const feesResult = await req.db.query(
            `SELECT 
                COUNT(*) as "totalRecords",
                COALESCE(SUM(amount), 0) as "totalAmount",
                COALESCE(SUM(CASE WHEN "isPaid" = TRUE THEN amount ELSE 0 END), 0) as "totalPaid",
                COALESCE(SUM(CASE WHEN "isPaid" = FALSE THEN amount ELSE 0 END), 0) as "totalPending",
                SUM(CASE WHEN "isPaid" = TRUE THEN 1 ELSE 0 END) as "paidCount",
                SUM(CASE WHEN "isPaid" = FALSE THEN 1 ELSE 0 END) as "pendingCount"
             FROM fees`
        );
        res.json({ success: true, report: feesResult.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Get fees trend data for last 30 days (aggregated by date)
router.get('/financials/trends', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await req.db.query(
            `SELECT 
                DATE("createdAt") as date,
                COALESCE(SUM(amount), 0) as amount,
                COUNT(*) as "transactionCount"
             FROM fees
             WHERE "isPaid" = TRUE AND "createdAt" >= $1
             GROUP BY DATE("createdAt")
             ORDER BY date ASC`,
            [thirtyDaysAgo]
        );

        // Calculate summary stats
        const totalCollected = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
        const average = result.rows.length > 0 ? totalCollected / result.rows.length : 0;
        const peak = result.rows.length > 0 ? Math.max(...result.rows.map(r => parseFloat(r.amount))) : 0;

        res.json({
            success: true,
            trends: result.rows,
            summary: {
                totalCollected,
                average,
                peak,
                daysWithData: result.rows.length
            }
        });
    } catch (err) {
        console.error('trends error:', err.message);
        res.status(500).json({ error: 'Failed to fetch trends', detail: err.message });
    }
});

// ============================================================
// TIMETABLE
// ============================================================

router.get('/timetable', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT t.*, u.name as "teacherName", u.phone as "teacherPhone" 
             FROM timetable t
             LEFT JOIN users u ON t."teacherId" = u.id
             ORDER BY t."dayOfWeek", t."startTime" ASC`
        );
        res.json({ success: true, timetable: result.rows });
    } catch (err) {
        console.error('timetable fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
});

router.post('/timetable', async (req, res) => {
    const { dayOfWeek, startTime, endTime, subject, classLevel, section, teacherId } = req.body;
    try {
        if (!dayOfWeek || !startTime || !endTime || !subject || !classLevel || !section || !teacherId) {
            return res.status(400).json({ error: 'Missing required fields, including section.' });
        }

        // Collision Check: Find any class for the SAME teacher on the SAME day that conflicts in time.
        // A conflict occurs if (newStart < oldEnd AND newEnd > oldStart)
        const conflictCheck = await req.db.query(
            `SELECT * FROM timetable 
             WHERE "teacherId" = $1 
             AND "dayOfWeek" = $2 
             AND ($3 < "endTime" AND $4 > "startTime")`,
            [teacherId, dayOfWeek, startTime, endTime]
        );

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Timetable overlap: The teacher is already scheduled for another class during this time.' });
        }

        const result = await req.db.query(
            `INSERT INTO timetable ("dayOfWeek", "startTime", "endTime", subject, "classLevel", section, "teacherId", "schoolId")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [dayOfWeek, startTime, endTime, subject, classLevel, section, teacherId, 'school-001']
        );
        res.status(201).json({ success: true, timetable: result.rows[0] });
    } catch (err) {
        console.error('timetable create error:', err.message);
        res.status(500).json({ error: 'Failed to create timetable entry' });
    }
});

router.delete('/timetable/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await req.db.query('DELETE FROM timetable WHERE id = $1 RETURNING id', [id]);
        if (!result.rows[0]) return res.status(404).json({ error: 'Timetable entry not found' });
        res.json({ success: true, message: 'Timetable entry deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete timetable entry' });
    }
});

// ============================================================
// ATTENDANCE - Overall Statistics
// ============================================================

router.get('/attendance/overall-monthly', getMonthlyOverallAttendance);

export default router;

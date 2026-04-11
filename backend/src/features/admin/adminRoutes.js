import express from 'express';
import { getUserByPhone, createUser, updateUser, deleteUser, toggleUserStatus } from '../auth/User.js';
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
            'SELECT id, phone, email, role, "isActive", "createdAt" FROM users WHERE role IN ($1, $2, $3)',
            ['teacher', 'staff', 'admin']
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
    const { phone, email, role } = req.body;
    try {
        const user = await updateUser(req.db, id, { phone, email, role });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user });
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
    const { firstName, lastName, phone, email, classLevel, section, fatherName, motherName, joiningDate, status, password } = req.body;
    try {
        if (!firstName || !phone || !classLevel || !section || !password || !fatherName || !motherName) {
            return res.status(400).json({ error: 'Missing required fields (Name, Phone, Class, Section, Password, and Parent Names are mandatory)' });
        }

        const fullName = `${firstName} ${lastName || ''}`.trim();
        
        // 1. Handle User Creation
        let user = await getUserByPhone(req.db, phone);
        if (!user) {
            // Student role is created with the provided password
            user = await createUser(req.db, { 
                name: fullName, 
                phone, 
                email: email || null, 
                password, 
                role: 'student' 
            });
            
            // Auto-approve student user
            await req.db.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user.id]);
        }

        // 2. Generate Unique Formatted Roll Number
        // Format: <class(2)><section(1)><serial(3)> e.g. 09A001
        // Even if classLevel is "9", we use "09" for the roll number prefix
        const classPart = classLevel.toString().padStart(2, '0'); 
        const sectionPart = section.toUpperCase();
        const prefix = `${classPart}${sectionPart}`;

        // Find how many students already exist with this prefix in their roll number
        const countResult = await req.db.query(
            `SELECT COUNT(*) FROM students WHERE "rollNumber" LIKE $1`,
            [`${prefix}%`]
        );
        const nextSerial = parseInt(countResult.rows[0].count) + 1;
        const serialPart = nextSerial.toString().padStart(3, '0'); // 1 -> "001"
        const rollNumber = `${prefix}${serialPart}`;

        // 3. Create Student record
        const student = await createStudent(req.db, {
            userId: user.id,
            name: fullName,
            classLevel: classLevel.toString(), // Store as "9", "10" etc.
            section,
            fatherName,
            motherName,
            phone,
            email: email || null,
            joiningDate: joiningDate || new Date().toISOString().split('T')[0],
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
        const result = await req.db.query(
            `DELETE FROM students WHERE id = $1 RETURNING id`,
            [id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Student not found' });
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
    const { dayOfWeek, startTime, endTime, subject, classLevel, teacherId } = req.body;
    try {
        if (!dayOfWeek || !startTime || !endTime || !subject || !classLevel || !teacherId) {
            return res.status(400).json({ error: 'Missing required fields' });
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
            `INSERT INTO timetable ("dayOfWeek", "startTime", "endTime", subject, "classLevel", "teacherId", "schoolId")
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [dayOfWeek, startTime, endTime, subject, classLevel, teacherId, 'school-001']
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

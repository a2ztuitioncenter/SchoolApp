import express from 'express';
import { getUserByPhone, createUser, updateUser, deleteUser, toggleUserStatus } from '../auth/User.js';
import { createStudent, getStudentsBySchool } from '../student/Student.js';
import { getPendingFees, getAllStudentFees, getFeesSummary } from '../fees/Fee.js';

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
    const { name, phone, email, role } = req.body;
    try {
        if (!name || !phone || !role) return res.status(400).json({ error: 'Missing fields' });
        const exists = await getUserByPhone(req.db, phone);
        if (exists) return res.status(409).json({ error: 'Phone already registered' });
        const user = await createUser(req.db, { phone, email, password: 'password123', role, schoolId: 'school-001' });
        res.status(201).json({ success: true, user });
    } catch (err) {
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
    const { name, phone, email, classLevel, section, fatherName, motherName, joiningDate, status } = req.body;
    try {
        if (!name || !phone || !classLevel) return res.status(400).json({ error: 'Missing fields' });
        let user = await getUserByPhone(req.db, phone);
        if (!user) {
            user = await createUser(req.db, { phone, email, password: 'student123', role: 'student' });
        }
        const student = await createStudent(req.db, {
            userId: user.id, name, classLevel, section, fatherName, motherName, phone, email,
            joiningDate: joiningDate || new Date().toISOString().split('T')[0],
            status: status || 'active',
            rollNumber: Math.floor(Math.random() * 10000).toString()
        });
        res.status(201).json({ success: true, student });
    } catch (err) {
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

export default router;

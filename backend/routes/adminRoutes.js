import express from 'express';
import { getUserByPhone, createUser } from '../models/User.js';
import { createStudent, getStudentsBySchool } from '../models/Student.js';
import { getPendingFees, getAllStudentFees, getFeesSummary } from '../models/Fee.js';

const router = express.Router();

// --- Users Module ---
router.get('/users', async (req, res) => {
    try {
        const result = await req.db.query(
            'SELECT id, phone, email, role, "isActive" FROM users WHERE role IN ($1, $2, $3)',
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

// --- Students Module ---
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
            userId: user.id, name, classLevel, section, fatherName, motherName, phone, email, joiningDate, status,
            rollNumber: Math.floor(Math.random() * 10000).toString()
        });
        res.status(201).json({ success: true, student });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Financials ---
router.get('/financials/unpaid-fees', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT 
                f.id, f.amount, f."dueDate", f."isPaid" as paid,
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

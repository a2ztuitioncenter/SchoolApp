import { createUser, generateTeacherId, isUsernameTaken } from './User.js';
import { createStudent } from '../student/Student.js';
import { sanitizeIdentifier, sanitizeText } from '../../utils/sanitize.js';
import { validateUsername } from '../../utils/validate.js';

/**
 * Unified registration service for all roles
 * Ensures consistent status, validation, and data mapping
 */
export const registerUser = async (client, payload) => {
    let { 
        role, 
        name, 
        phone, 
        email, 
        password, 
        username,
        schoolId = 'school-001',
        // Student specific
        classLevel,
        section = 'A',
        fatherName,
        motherName,
        dateOfBirth,
        joiningDate,
        rollNumber,
        // Meta
        source = 'public' // 'admin' or 'public'
    } = payload;

    const normalizedRole = (role || '').toLowerCase();
    if (!['student', 'teacher', 'staff'].includes(normalizedRole)) {
        const err = new Error('Invalid role. Must be student, teacher, or staff');
        err.status = 400;
        throw err;
    }

    // 1. Validate Name (Required for all roles, especially students)
    if (!name || name.trim() === '') {
        const err = new Error('Full name is required for registration');
        err.status = 400;
        throw err;
    }

    // 0. Default Password for Admin-Created Users or Students
    if (!password && (source === 'admin' || normalizedRole === 'student')) {
        // For students, use DOB as initial password. For others, use a random or default string.
        if (normalizedRole === 'student' && dateOfBirth) {
            // dateOfBirth might be ISO or DD/MM/YYYY depending on where it comes from
            password = dateOfBirth.replace(/-/g, '/'); // Simplified default
        } else {
            password = 'Welcome@' + Math.floor(1000 + Math.random() * 9000);
        }
    }

    if (!password) {
        throw new Error('Password is required for registration');
    }

    // 1. Shared Username Validation
    if (username) {
        const usernameError = validateUsername(username);
        if (usernameError) throw new Error(usernameError);

        const taken = await isUsernameTaken(client, username);
        if (taken) {
            const err = new Error(`Username '${username}' is already taken`);
            err.status = 409;
            throw err;
        }
    }

    // 2. Base User Creation (Always starts as 'pending')
    const userPayload = {
        name: sanitizeText(name, 100),
        phone: sanitizeIdentifier(phone, 15),
        email: email ? sanitizeText(email, 255) : null,
        password,
        role: normalizedRole,
        schoolId,
        username: username || null,
        status: 'pending', // UNIFIED: Always pending
        passwordStatus: source === 'admin' ? 'generated' : 'verified'
    };

    // Role-specific ID generation for Teacher/Staff
    if (normalizedRole === 'teacher' || normalizedRole === 'staff') {
        userPayload.teacherId = await generateTeacherId(client, normalizedRole);
    }

    const user = await createUser(client, userPayload);

    // Auto-generate username if not provided
    if (!username) {
        await client.query('UPDATE users SET username = $1 WHERE id = $2', [`user_${user.id}`, user.id]);
        user.username = `user_${user.id}`;
    }

    // 3. Student Specific Record
    let student = null;
    if (normalizedRole === 'student') {
        // Roll number generation if not provided (for admin flow)
        if (!rollNumber) {
            const prefix = `${classLevel}${section}`;
            
            // Add advisory lock to prevent concurrent roll number generation race conditions
            const lockKey = `roll_number_${schoolId}_${prefix}`;
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);

            const maxResult = await client.query(
                `SELECT MAX(CAST(SUBSTRING(roll_number, $2) AS INTEGER)) as max_num 
                 FROM students 
                 WHERE roll_number ~ ('^' || $1 || '[0-9]{3}$')`,
                [prefix, (prefix.length + 1).toString()]
            );
            const nextNum = (maxResult.rows[0].max_num || 0) + 1;
            rollNumber = `${prefix}${nextNum.toString().padStart(3, '0')}`;
        }

        student = await createStudent(client, {
            userId: user.id,
            name: user.name,
            classLevel: classLevel.toString(),
            section,
            fatherName: sanitizeText(fatherName, 100),
            motherName: sanitizeText(motherName, 100),
            phone: user.phone,
            email: user.email,
            joiningDate: joiningDate || new Date().toISOString().split('T')[0],
            dateOfBirth: dateOfBirth, // Should be in ISO already or handled by DB
            status: 'pending', // Sync with user status
            rollNumber,
            schoolId
        });
    }

    return {
        user,
        student,
        status: 'pending'
    };
};

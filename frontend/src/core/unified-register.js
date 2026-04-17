import { authAPI } from './api.js';

/**
 * Unified Registration Form Component
 * Handles student, teacher, and staff registration with role selector
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const roleSelect = document.getElementById('role-select');
    const registerBtn = document.getElementById('register-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    if (!registerForm || !roleSelect) return;

    // Role-specific field visibility
    const studentFields = document.getElementById('student-fields');
    const teacherStaffFields = document.getElementById('teacher-staff-fields');

    // Handle role selection changes
    roleSelect.addEventListener('change', (e) => {
        const selectedRole = e.target.value;

        if (selectedRole === 'student') {
            studentFields.style.display = 'block';
            teacherStaffFields.style.display = 'none';
        } else if (selectedRole === 'teacher' || selectedRole === 'staff') {
            studentFields.style.display = 'none';
            teacherStaffFields.style.display = 'block';
        } else {
            studentFields.style.display = 'none';
            teacherStaffFields.style.display = 'none';
        }
    });

    // Trigger role change on page load to set initial state
    roleSelect.dispatchEvent(new Event('change'));

    // Form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI state: loading
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        const role = document.getElementById('role-select').value;
        const name = document.getElementById('name-input').value.trim();
        const username = document.getElementById('username-input')?.value.trim();
        const phone = document.getElementById('phone-input').value.trim();
        const password = document.getElementById('password-input').value;
        const confirmPassword = document.getElementById('confirm-password-input').value;

        // Validate passwords match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match. Please try again.';
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
            return;
        }

        // Base form data
        const formData = {
            role,
            name,
            username: username || undefined,
            phone,
            password,
            confirmPassword,
        };

        // Role-specific fields
        if (role === 'student') {
            const classLevel = document.getElementById('class-level-select')?.value;
            const section = document.getElementById('section-input')?.value.trim();
            const fatherName = document.getElementById('father-name-input')?.value.trim();
            const motherName = document.getElementById('mother-name-input')?.value.trim();
            const dateOfBirth = document.getElementById('dob-input')?.value;

            if (!classLevel || !section || !fatherName || !motherName || !dateOfBirth) {
                errorMessage.textContent = 'All student fields (including Date of Birth) are required.';
                errorMessage.style.display = 'block';
                registerBtn.disabled = false;
                registerBtn.textContent = 'Sign Up';
                return;
            }

            let formattedDob = dateOfBirth;
            if (dateOfBirth.includes('-')) {
                const [yyyy, mm, dd] = dateOfBirth.split('-');
                formattedDob = `${dd}/${mm}/${yyyy.slice(2)}`;
            }

            formData.classLevel = classLevel;
            formData.section = section;
            formData.fatherName = fatherName;
            formData.motherName = motherName;
            formData.dateOfBirth = formattedDob;
        } else if (role === 'teacher' || role === 'staff') {
            const email = document.getElementById('email-input')?.value.trim();

            if (!email) {
                errorMessage.textContent = 'Email is required for ' + role + '.';
                errorMessage.style.display = 'block';
                registerBtn.disabled = false;
                registerBtn.textContent = 'Sign Up';
                return;
            }

            formData.email = email;
        }

        try {
            const response = await authAPI.register(formData);

            if (response.success) {
                if (role === 'student') {
                    successMessage.innerHTML = `✅ <strong>Student Registration Successful!</strong><br>
                    Roll Number: <strong>${response.student.rollNumber}</strong><br>
                    Your account is active. You will be able to login immediately. Redirecting...`;
                } else {
                    successMessage.innerHTML = `✅ <strong>${role.charAt(0).toUpperCase() + role.slice(1)} Registration Successful!</strong><br>
                    ${role.toUpperCase()} ID: <strong>${response.user.teacherId}</strong><br>
                    Your account is awaiting admin approval. You will be able to login once approved. Redirecting...`;
                }
                successMessage.style.display = 'block';
                registerForm.reset();

                // Redirect to home after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            } else {
                errorMessage.textContent = response.error || 'Registration failed. Please try again.';
                errorMessage.style.display = 'block';
                registerBtn.disabled = false;
                registerBtn.textContent = 'Sign Up';
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'An error occurred during registration.';
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
        }
    });
});

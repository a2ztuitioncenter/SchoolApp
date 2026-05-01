import { authAPI } from './api.js';
import { DEFAULT_CLASSES, DEFAULT_SECTIONS } from './academicDefaults.js';


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

    // Student section population logic
    const classLevelSelect = document.getElementById('class-level-select');
    const sectionSelect = document.getElementById('section-select');

    const populateSections = async (classLevel) => {
        if (!sectionSelect) return;
        
        sectionSelect.innerHTML = '<option value="">Loading...</option>';
        sectionSelect.disabled = true;

        try {
            const res = await authAPI.getSections(classLevel);
            let sections = res.success && res.data ? res.data : [];
            
            // Hybrid Fallback: Ensure A and B are always present
            const defaultVals = DEFAULT_SECTIONS.map(s => s.value);
            sections = [...new Set([...sections, ...defaultVals])].sort();

            sectionSelect.innerHTML = '<option value="">Select Section</option>' +
                sections.map(s => `<option value="${s}">${s}</option>`).join('');
            sectionSelect.disabled = false;
        } catch (err) {
            console.error('Failed to fetch sections:', err);
            // Fallback on error
            const sections = DEFAULT_SECTIONS.map(s => s.value);
            sectionSelect.innerHTML = '<option value="">Select Section</option>' +
                sections.map(s => `<option value="${s}">${s}</option>`).join('');
            sectionSelect.disabled = false;
        }
    };

    if (classLevelSelect) {
        // Initial population of Class levels from defaults
        classLevelSelect.innerHTML = '<option value="">Select Class</option>' +
            DEFAULT_CLASSES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');

        classLevelSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                populateSections(e.target.value);
            } else {
                if (sectionSelect) {
                    sectionSelect.innerHTML = '<option value="">Select Class First</option>';
                    sectionSelect.disabled = true;
                }
            }
        });
    }

    // Role-specific field visibility

    const studentFields = document.getElementById('student-fields');
    const teacherStaffFields = document.getElementById('teacher-staff-fields');

    // Handle role selection changes
    roleSelect.addEventListener('change', (e) => {
        const selectedRole = e.target.value;

        // Form elements to toggle required status
        const studentInputs = [
            document.getElementById('dob-input'),
            document.getElementById('class-level-select'),
            document.getElementById('section-select'),
            document.getElementById('father-name-input'),
            document.getElementById('mother-name-input')
        ];

        const teacherInputs = [
            document.getElementById('email-input')
        ];

        if (selectedRole === 'student') {
            studentFields.style.display = 'block';
            teacherStaffFields.style.display = 'none';
            studentInputs.forEach(el => el?.setAttribute('required', ''));
            teacherInputs.forEach(el => el?.removeAttribute('required'));
        } else if (selectedRole === 'teacher' || selectedRole === 'staff') {
            studentFields.style.display = 'none';
            teacherStaffFields.style.display = 'block';
            studentInputs.forEach(el => el?.removeAttribute('required'));
            teacherInputs.forEach(el => el?.setAttribute('required', ''));
        } else {
            studentFields.style.display = 'none';
            teacherStaffFields.style.display = 'none';
            studentInputs.forEach(el => el?.removeAttribute('required'));
            teacherInputs.forEach(el => el?.removeAttribute('required'));
        }
    });

    // Trigger role change on page load to set initial state
    roleSelect.dispatchEvent(new Event('change'));

    // Real-time username check logic using optimized checker
    const usernameInput = document.getElementById('username-input');
    const usernameError = document.getElementById('username-input-error');
    
    const usernameChecker = new UsernameAvailabilityChecker((status, val) => {
        if (!usernameError) return;

        usernameError.style.display = 'block';
        usernameError.className = 'input-error-message'; // Reset classes

        switch (status) {
            case 'idle':
                usernameError.style.display = 'none';
                break;
            case 'invalid_short':
                usernameError.textContent = `Username must be at least 5 characters`;
                usernameError.style.color = '#ef4444';
                break;
            case 'invalid_long':
                usernameError.textContent = 'Username must be less than 50 characters';
                usernameError.style.color = '#ef4444';
                break;
            case 'invalid_format':
                usernameError.textContent = 'Only lowercase letters, numbers, and underscores allowed';
                usernameError.style.color = '#ef4444';
                break;
            case 'checking':
                usernameError.textContent = 'Checking availability...';
                usernameError.style.color = '#6b7280';
                break;
            case 'available':
                usernameError.textContent = 'Username available ✅';
                usernameError.style.color = '#10b981';
                break;
            case 'taken':
                usernameError.textContent = 'Username already taken ❌';
                usernameError.style.color = '#ef4444';
                break;
            case 'error':
                usernameError.textContent = 'Check failed. Please try again.';
                usernameError.style.color = '#f59e0b';
                break;
        }
    });

    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            usernameChecker.check(e.target.value);
        });
    }


    // Form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI state: loading
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        const role = roleSelect.value;
        const name = document.getElementById('name-input')?.value?.trim() || '';
        const username = document.getElementById('username-input')?.value?.trim() || '';
        const phone = document.getElementById('phone-input')?.value?.trim() || '';
        const password = document.getElementById('password-input')?.value || '';
        const confirmPassword = document.getElementById('confirm-password-input')?.value || '';

        // Validate passwords match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match. Please try again.';
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
            return;
        }

        // Validate username
        if (!username) {
            errorMessage.textContent = 'Username is required.';
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
            return;
        }
        if (username.length < 5) {
            errorMessage.textContent = 'Username must be at least 5 characters.';
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorMessage.textContent = 'Username can only contain letters, numbers, and underscores.';
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
            const section = document.getElementById('section-select')?.value;
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
                const parts = dateOfBirth.split('-');
                if (parts.length === 3 && parts.every(p => p)) {
                    const [yyyy, mm, dd] = parts;
                    formattedDob = `${dd}/${mm}/${yyyy.slice(2)}`;
                } else {
                    errorMessage.textContent = 'Invalid date format. Please use YYYY-MM-DD.';
                    errorMessage.style.display = 'block';
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Sign Up';
                    return;
                }
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

        function escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        try {
            const response = await authAPI.register(formData);

            if (response.success) {
                window.registrationSuccessModal.show({
                    username: response.data.username,
                    rollNumber: response.data.rollNumber,
                    title: 'Registration Successful!',
                    message: 'Your account has been created and is now awaiting administrator approval. You will be able to log in once an administrator approves your account.'
                });
                
                registerForm.reset();
                registerBtn.disabled = false;
                registerBtn.textContent = 'Sign Up';
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

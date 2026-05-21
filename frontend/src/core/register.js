import { authAPI } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
    const cards = document.querySelectorAll('.role-card');
    const sections = document.querySelectorAll('.form-section');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            card.classList.add('active');
            const targetId = `${card.dataset.target}-section`;
            document.getElementById(targetId).classList.add('active');
            
            // Clear any old messages
            document.querySelectorAll('.message-box').forEach(el => {
                el.className = 'message-box';
                el.textContent = '';
            });
        });
    });

    // Password toggle visibility logic
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const wrapper = toggle.closest('.password-wrapper');
            if (!wrapper) return;
            const input = wrapper.querySelector('input');
            const icon = toggle.querySelector('i');
            
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fa-regular fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fa-regular fa-eye';
                }
            }
        });
    });

    // Username validation helper
    function setupUsernameValidation(inputSelector, statusSelector) {
        const input = document.querySelector(inputSelector);
        const status = document.querySelector(statusSelector);
        if (!input || !status) return;

        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const val = input.value.trim();

            if (!val) {
                status.textContent = 'Minimum 5 characters';
                status.style.color = '#6b7280';
                return;
            }
            if (val.length < 5) {
                status.textContent = 'Must be at least 5 characters';
                status.style.color = '#dc2626';
                return;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(val)) {
                status.textContent = 'Only letters, numbers, and underscores allowed';
                status.style.color = '#dc2626';
                return;
            }

            status.textContent = 'Checking availability...';
            status.style.color = '#6b7280';

            debounceTimer = setTimeout(async () => {
                try {
                    const res = await authAPI.checkUsername(val);
                    if (res.available) {
                        status.textContent = '✅ Username is available';
                        status.style.color = '#16a34a';
                    } else {
                        status.textContent = '❌ ' + (res.error || 'Username is taken');
                        status.style.color = '#dc2626';
                    }
                } catch {
                    status.textContent = 'Could not check availability';
                    status.style.color = '#6b7280';
                }
            }, 500);
        });
    }

    setupUsernameValidation('#student-username', '#student-username-status');
    setupUsernameValidation('#teacher-username', '#teacher-username-status');

    // Student Signup
    const studentForm = document.getElementById('studentSignupFormElement');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('student-first-name').value.trim();
            const lastName = document.getElementById('student-last-name').value.trim();
            const username = document.getElementById('student-username').value.trim();
            const dobRaw = document.getElementById('student-dob').value;
            const phone = document.getElementById('student-phone').value.trim();
            const email = document.getElementById('student-email').value.trim();
            const classLevel = document.getElementById('student-class').value;
            const section = document.getElementById('student-section-select').value;
            const fatherName = document.getElementById('student-father').value.trim();
            const motherName = document.getElementById('student-mother').value.trim();
            const password = document.getElementById('student-password').value;
            const confirmPassword = document.getElementById('student-confirm').value;

            const errorDiv = document.getElementById('studentSignupError');
            const successDiv = document.getElementById('studentSignupSuccess');
            const btn = document.getElementById('studentSignupBtn');

            clearMessages(errorDiv, successDiv);

            if (!username || username.length < 5 || !/^[a-zA-Z0-9_]+$/.test(username)) {
                return showError(errorDiv, 'Invalid username. Must be at least 5 chars, letters/numbers/underscores only.');
            }

            if (!password) {
                return showError(errorDiv, 'Password is required.');
            }

            if (password.length < 6) {
                return showError(errorDiv, 'Password must be at least 6 characters long.');
            }

            if (password !== confirmPassword) {
                return showError(errorDiv, 'Passwords do not match.');
            }

            // Format YYYY-MM-DD -> DD/MM/YY
            const parts = dobRaw.split('-');
            if (parts.length !== 3 || parts.some(p => !p)) return showError(errorDiv, 'Invalid date format.');
            const [yyyy, mm, dd] = parts;
            const yy = yyyy.slice(2);
            const dateOfBirth = `${dd}/${mm}/${yy}`;

            btn.disabled = true;
            btn.textContent = 'Creating Account...';

            try {
                const response = await authAPI.register({
                    role: 'student',
                    firstName, lastName, phone, email: email || null,
                    dateOfBirth, classLevel, section, fatherName, motherName, username,
                    password, confirmPassword
                });

                if (response.success) {
                    btn.textContent = 'Sign Up as Student';
                    showRegistrationPopup('success', 'Your student account has been created. An admin will review and activate your account shortly.');
                } else {
                    btn.disabled = false;
                    btn.textContent = 'Sign Up as Student';
                    showError(errorDiv, response.error || 'Registration failed.');
                }
            } catch (error) {
                btn.disabled = false;
                btn.textContent = 'Sign Up as Student';
                showError(errorDiv, error.message || 'An unexpected error occurred.');
            }
        });
    }

    // Teacher Signup
    const teacherForm = document.getElementById('teacherSignupFormElement');
    if (teacherForm) {
        teacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const role = document.getElementById('teacher-role').value;
            const name = document.getElementById('teacher-name').value.trim();
            const username = document.getElementById('teacher-username').value.trim();
            const phone = document.getElementById('teacher-phone').value.trim();
            const email = document.getElementById('teacher-email').value.trim();
            const password = document.getElementById('teacher-password').value.trim();
            const confirmPassword = document.getElementById('teacher-confirm').value.trim();

            const errorDiv = document.getElementById('teacherSignupError');
            const successDiv = document.getElementById('teacherSignupSuccess');
            const btn = document.getElementById('teacherSignupBtn');

            clearMessages(errorDiv, successDiv);

            if (!username || username.length < 5 || !/^[a-zA-Z0-9_]+$/.test(username)) {
                return showError(errorDiv, 'Invalid username. Must be at least 5 chars, letters/numbers/underscores only.');
            }

            if (password !== confirmPassword) {
                return showError(errorDiv, 'Passwords do not match');
            }

            btn.disabled = true;
            btn.textContent = 'Creating Account...';

            try {
                const response = await authAPI.teacherRegister({
                    name, email, phone, password, confirmPassword, role, username
                });

                if (response.success) {
                    btn.textContent = 'Sign Up as Teacher / Staff';
                    showRegistrationPopup('success', 'Your account has been created and is awaiting admin approval. You will be able to log in once approved.');
                } else {
                    btn.disabled = false;
                    btn.textContent = 'Sign Up as Teacher / Staff';
                    showError(errorDiv, response.error || 'Registration failed.');
                }
            } catch (error) {
                btn.disabled = false;
                btn.textContent = 'Sign Up as Teacher / Staff';
                showError(errorDiv, error.message || 'An unexpected error occurred.');
            }
        });
    }

    function showError(element, msg) {
        element.textContent = msg;
        element.className = 'message-box error';
    }

    function clearMessages(err, succ) {
        err.className = 'message-box';
        err.textContent = '';
        succ.className = 'message-box';
        succ.textContent = '';
    }

    function showRegistrationPopup(type, message) {
        const existing = document.getElementById('reg-result-popup');
        if (existing) existing.remove();

        const isSuccess = type === 'success';

        const popup = document.createElement('div');
        popup.id = 'reg-result-popup';
        popup.innerHTML = `
            <div style="position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.25s ease;">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"></div>
                <div style="position: relative; z-index: 1; background: #fff; border-radius: 20px; padding: 40px 36px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.25); animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);">
                    <div style="font-size: 64px; margin-bottom: 16px; color: ${isSuccess ? '#16a34a' : '#dc2626'}">
                        <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    </div>
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; font-weight: 700; margin: 0 0 10px; color: #111;">
                        ${isSuccess ? 'Registration Successful!' : 'Registration Failed'}
                    </h2>
                    <p style="font-size: 0.95rem; color: #555; margin: 0 0 20px; line-height: 1.55;">${message}</p>
                    ${isSuccess ? '<div style="display: inline-flex; align-items: center; gap: 6px; background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; border-radius: 999px; padding: 6px 16px; font-size: 0.85rem; font-weight: 600; margin-bottom: 24px;"><i class="fas fa-clock"></i> Pending Admin Approval</div>' : ''}
                    <button id="reg-popup-close" style="width: 100%; padding: 13px; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; background: ${isSuccess ? '#16a34a' : '#dc2626'}; color: #fff;">
                        ${isSuccess ? 'Got it!' : 'Try Again'}
                    </button>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { transform: translateY(40px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            </style>
        `;
        document.body.appendChild(popup);

        document.getElementById('reg-popup-close').addEventListener('click', () => {
            popup.remove();
            if (isSuccess) window.location.href = '/login';
        });
    }
});

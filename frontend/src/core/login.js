import { authAPI } from './api.js';
import { setAuth } from './auth-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
    const tabs = document.querySelectorAll('.auth-tab');
    const sections = document.querySelectorAll('.form-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const targetId = `${tab.dataset.target}-section`;
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

    // Student Login
    const studentForm = document.getElementById('studentLoginFormElement');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('student-login-identifier').value.trim();
            const dateOfBirth = document.getElementById('student-login-dob').value.trim();
            const errorDiv = document.getElementById('studentLoginError');
            const successDiv = document.getElementById('studentLoginSuccess');
            const btn = document.getElementById('studentLoginBtn');

            clearMessages(errorDiv, successDiv);
            if (!identifier || !dateOfBirth) return showError(errorDiv, 'Both fields are required');

            btn.disabled = true;
            btn.innerHTML = '<span>Verifying...</span> <i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await authAPI.login(identifier, dateOfBirth);
                if (response.success) {
                    setAuth({
                        isLoggedIn: true,
                        role: 'student',
                        userId: response.userId || response.user?.id,
                        name: response.student?.name || '',
                        phone: response.user?.phone || identifier,
                        csrfToken: response.csrfToken
                    });
                    showSuccess(successDiv, 'Verified! Redirecting...');
                    setTimeout(() => window.location.href = '/student-dashboard.html', 1000);
                } else {
                    showError(errorDiv, response.error || 'Login failed');
                    btn.disabled = false;
                    btn.innerHTML = '<span>Sign In as Student</span> <i class="fas fa-arrow-right"></i>';
                }
            } catch (error) {
                showError(errorDiv, error.message || 'Login failed');
                btn.disabled = false;
                btn.innerHTML = '<span>Sign In as Student</span> <i class="fas fa-arrow-right"></i>';
            }
        });
    }

    // Teacher Login
    const teacherForm = document.getElementById('teacherLoginFormElement');
    if (teacherForm) {
        teacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('teacher-login-identifier').value.trim();
            const password = document.getElementById('teacher-login-password').value.trim();
            const errorDiv = document.getElementById('teacherLoginError');
            const successDiv = document.getElementById('teacherLoginSuccess');
            const btn = document.getElementById('teacherLoginBtn');

            clearMessages(errorDiv, successDiv);
            if (!identifier || !password) return showError(errorDiv, 'Both fields are required');

            btn.disabled = true;
            btn.innerHTML = '<span>Verifying...</span> <i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await authAPI.teacherLogin(identifier, password);
                if (response.success && (response.user.role === 'teacher' || response.user.role === 'staff')) {
                    setAuth({
                        isLoggedIn: true,
                        role: 'teacher',
                        userId: response.user?.id || response.userId,
                        name: response.user?.name || '',
                        phone: response.user?.phone || identifier,
                        csrfToken: response.csrfToken
                    });
                    showSuccess(successDiv, 'Verified! Redirecting...');
                    setTimeout(() => window.location.href = '/teacher-dashboard.html', 1000);
                } else {
                    showError(errorDiv, 'Access Denied or invalid credentials');
                    btn.disabled = false;
                    btn.innerHTML = '<span>Sign In as Teacher</span> <i class="fas fa-arrow-right"></i>';
                }
            } catch (error) {
                showError(errorDiv, error.message || 'Login failed');
                btn.disabled = false;
                btn.innerHTML = '<span>Sign In as Teacher</span> <i class="fas fa-arrow-right"></i>';
            }
        });
    }

    // Admin Login
    const adminForm = document.getElementById('adminLoginFormElement');
    if (adminForm) {
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('admin-login-identifier').value.trim();
            const password = document.getElementById('admin-login-password').value.trim();
            const errorDiv = document.getElementById('adminLoginError');
            const successDiv = document.getElementById('adminLoginSuccess');
            const btn = document.getElementById('adminLoginBtn');

            clearMessages(errorDiv, successDiv);
            if (!identifier || !password) return showError(errorDiv, 'Both fields are required');

            btn.disabled = true;
            btn.innerHTML = '<span>Verifying...</span> <i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await authAPI.adminLogin(identifier, password);
                if (response.success && response.user.role === 'admin') {
                    setAuth({
                        isLoggedIn: true,
                        role: 'admin',
                        userId: response.user?.id || response.userId,
                        name: response.user?.name || '',
                        phone: response.user?.phone || identifier,
                        csrfToken: response.csrfToken
                    });
                    showSuccess(successDiv, 'Verified! Redirecting...');
                    setTimeout(() => window.location.href = '/admin-dashboard.html', 1000);
                } else {
                    showError(errorDiv, 'Access Denied or invalid credentials');
                    btn.disabled = false;
                    btn.innerHTML = '<span>Sign In as Admin</span> <i class="fas fa-shield-halved"></i>';
                }
            } catch (error) {
                showError(errorDiv, error.message || 'Login failed');
                btn.disabled = false;
                btn.innerHTML = '<span>Sign In as Admin</span> <i class="fas fa-shield-halved"></i>';
            }
        });
    }

    function showError(element, msg) {
        element.textContent = msg;
        element.className = 'message-box error';
    }

    function showSuccess(element, msg) {
        element.textContent = msg;
        element.className = 'message-box success';
    }

    function clearMessages(err, succ) {
        err.className = 'message-box';
        err.textContent = '';
        succ.className = 'message-box';
        succ.textContent = '';
    }
});

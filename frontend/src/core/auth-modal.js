/**
 * Auth Modal Controller
 * Handles opening/closing auth modals and form injection
 */

import { authAPI as importedAuthAPI } from './api.js';
import { setAuth as importedSetAuth } from './auth-manager.js';

// Make globally accessible
window.authAPI = importedAuthAPI;
window.setAuth = importedSetAuth;

let currentAuthType = null;
let currentAuthRole = null;

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Open login selector (shows role selection cards)
 */
function openAuthLoginSelector(event) {
    event?.preventDefault?.();
    const modal = document.getElementById("authModal");
    const content = document.getElementById("authContent");

    content.innerHTML = `
        <div class="modal-header">
            <h2>Login to Your Account</h2>
            <p class="modal-subtitle">Choose your role to continue</p>
        </div>
        <div class="auth-selector-grid">
            <div class="auth-selector-card" onclick="openAuthModal('login', 'student')">
                <div class="auth-selector-card-icon"><i class="fas fa-book"></i></div>
                <h3>Student</h3>
                <p>Access your courses</p>
            </div>
            <div class="auth-selector-card" onclick="openAuthModal('login', 'teacher')">
                <div class="auth-selector-card-icon"><i class="fas fa-chalkboard-user"></i></div>
                <h3>Teacher</h3>
                <p>Manage classes</p>
            </div>
            <div class="auth-selector-card" onclick="openAuthModal('login', 'admin')">
                <div class="auth-selector-card-icon"><i class="fas fa-building"></i></div>
                <h3>Admin</h3>
                <p>System admin</p>
            </div>
        </div>
    `;

    showModal();
}

/**
 * Open signup selector (shows role selection cards)
 */
function openAuthSignupSelector(event) {
    event?.preventDefault?.();
    const modal = document.getElementById("authModal");
    const content = document.getElementById("authContent");

    content.innerHTML = `
        <div class="modal-header">
            <h2>Create Your Account</h2>
            <p class="modal-subtitle">Choose your role to get started</p>
        </div>
        <div class="auth-selector-grid signup">
            <div class="auth-selector-card" onclick="openAuthModal('signup', 'student')">
                <div class="auth-selector-card-icon"><i class="fas fa-graduation-cap"></i></div>
                <h3>Student</h3>
                <p>Join as a student and start learning</p>
            </div>
            <div class="auth-selector-card" onclick="openAuthModal('signup', 'teacher')">
                <div class="auth-selector-card-icon"><i class="fas fa-chalkboard-user"></i></div>
                <h3>Teacher/Staff</h3>
                <p>Join as an educator and share knowledge</p>
            </div>
        </div>
    `;

    showModal();
}

/**
 * Open specific auth form (login or signup for a specific role)
 */
function openAuthModal(type, role) {
    const modal = document.getElementById("authModal");
    const content = document.getElementById("authContent");

    currentAuthType = type;
    currentAuthRole = role;

    let formContainerId;
    if (type === 'login') {
        if (role === 'student') formContainerId = 'studentLoginForm';
        else if (role === 'teacher') formContainerId = 'teacherLoginForm';
        else if (role === 'admin') formContainerId = 'adminLoginForm';
    } else if (type === 'signup') {
        if (role === 'student') formContainerId = 'studentSignupForm';
        else if (role === 'teacher') formContainerId = 'teacherSignupForm';
        else if (role === 'unified') formContainerId = 'unifiedSignupForm';
    }

    if (!formContainerId) {
        console.error('Invalid auth type or role:', type, role);
        return;
    }

    const formContainer = document.getElementById(formContainerId);
    if (!formContainer) {
        console.error('Form container not found:', formContainerId);
        return;
    }

    // Clear existing content
    content.innerHTML = '';

    // Manage specific styling classes
    modal.classList.remove('student-signup-active');
    if (formContainerId === 'studentSignupForm') {
        modal.classList.add('student-signup-active');
    }

    // If it's a template, clone it. Otherwise use innerHTML for backward compatibility.
    if (formContainer.tagName === 'TEMPLATE') {
        const clone = formContainer.content.cloneNode(true);
        content.appendChild(clone);
    } else {
        content.innerHTML = formContainer.innerHTML;
    }

    // Rebind event listeners for the injected form
    rebindFormListeners(type, role);

    showModal();
}

/**
 * Rebind form event listeners after HTML injection
 */
function rebindFormListeners(type, role) {
    const modal = document.getElementById('authModal');
    if (type === 'login') {
        if (role === 'student') {
            const form = modal.querySelector('#studentLoginFormElement');
            if (form) form.addEventListener('submit', handleStudentLoginModal);
        } else if (role === 'teacher') {
            const btn = modal.querySelector('#teacherLoginBtn');
            if (btn) btn.addEventListener('click', handleTeacherLoginModal);
        } else if (role === 'admin') {
            const btn = modal.querySelector('#adminLoginBtn');
            if (btn) btn.addEventListener('click', handleAdminLoginModal);
        }
    } else if (type === 'signup') {
        if (role === 'student') {
            const form = modal.querySelector('#studentSignupFormElement');
            if (form) form.addEventListener('submit', handleStudentSignupModal);
            setupUsernameValidation(modal, '#student-signup-username', '#student-signup-username-status');
        } else if (role === 'teacher') {
            const form = modal.querySelector('#teacherSignupFormElement');
            if (form) form.addEventListener('submit', handleTeacherSignupModal);
            setupUsernameValidation(modal, '#teacher-signup-username', '#teacher-signup-username-status');
        } else if (role === 'unified') {
            // Unified signup form is handled by its own module (unified-register.js)
        }
    }
}

/**
 * Show modal with animation
 */
function showModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    // Trigger animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    setupModalCloseHandlers();
}

/**
 * Close modal with animation
 */
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('show');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('student-signup-active');
        document.body.classList.remove('modal-open');
        document.getElementById('authContent').innerHTML = '';
        currentAuthType = null;
        currentAuthRole = null;
    }, 250);
}

/**
 * Setup close handlers (ESC key, outside click)
 */
function setupModalCloseHandlers() {
    // ESC key
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

/**
 * Import and wrap login/signup handlers from existing modules
 */

// Student Login
async function handleStudentLoginModal(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('authModal');
    const identifier = modal.querySelector('#student-login-identifier')?.value?.trim();
    const dateOfBirth = modal.querySelector('#student-login-dob')?.value?.trim();
    const errorDiv = modal.querySelector('#studentLoginError');
    const btn = modal.querySelector('#studentLoginBtn');

    if (!identifier || !dateOfBirth) {
        showError(errorDiv, 'Phone/Username and Date of Birth are required');
        return;
    }
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
        const response = await window.authAPI.login(identifier, dateOfBirth);

        if (response.success) {
            window.setAuth({
                isLoggedIn: true,
                role: 'student',
                userId: response.userId || response.user?.id,
                name: response.student?.name || '',
                phone: response.user?.phone || identifier
            });

            const successDiv = modal.querySelector('#studentLoginSuccess');
            showSuccess(successDiv, 'Verified! Redirecting to dashboard...');
            btn.textContent = 'Redirecting...';

            setTimeout(() => {
                closeAuthModal();
                window.location.href = '/student-dashboard.html';
            }, 1500);
        } else {
            showError(errorDiv, response.error || 'Login failed');
            btn.disabled = false;
            btn.textContent = 'Log In';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(errorDiv, error.message || 'Login failed');
        btn.disabled = false;
        btn.textContent = 'Log In';
    }
}

// Teacher Login
async function handleTeacherLoginModal(e) {
    if (e) e.preventDefault?.();
    const modal = document.getElementById('authModal');
    const identifier = modal.querySelector('#teacher-login-identifier')?.value?.trim();
    const password = modal.querySelector('#teacher-login-password')?.value?.trim();
    const errorDiv = modal.querySelector('#teacherLoginError');
    const btn = modal.querySelector('#teacherLoginBtn');

    if (!identifier || !password) {
        showError(errorDiv, 'Phone/Username and password are required');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
        const response = await window.authAPI.teacherLogin(identifier, password);

        if (response.success && (response.user.role === 'teacher' || response.user.role === 'staff')) {
            window.setAuth({
                isLoggedIn: true,
                role: 'teacher',
                userId: response.user?.id || response.userId,
                name: response.user?.name || '',
                phone: response.user?.phone || identifier
            });

            const successDiv = modal.querySelector('#teacherLoginSuccess');
            showSuccess(successDiv, 'Teacher verified! Redirecting to portal...');
            btn.textContent = 'Redirecting...';

            setTimeout(() => {
                closeAuthModal();
                window.location.href = '/teacher-dashboard.html';
            }, 1500);
        } else {
            showError(errorDiv, 'Access Denied or invalid credentials');
            btn.disabled = false;
            btn.textContent = 'Login as Teacher';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(errorDiv, error.message || 'Login failed');
        btn.disabled = false;
        btn.textContent = 'Login as Teacher';
    }
}

// Admin Login
async function handleAdminLoginModal(e) {
    if (e) e.preventDefault?.();
    const modal = document.getElementById('authModal');
    const identifier = modal.querySelector('#admin-login-identifier')?.value?.trim();
    const password = modal.querySelector('#admin-login-password')?.value?.trim();
    const errorDiv = modal.querySelector('#adminLoginError');
    const btn = modal.querySelector('#adminLoginBtn');

    if (!identifier || !password) {
        showError(errorDiv, 'Phone/Username and password are required');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
        const response = await window.authAPI.adminLogin(identifier, password);

        if (response.success && response.user.role === 'admin') {
            window.setAuth({
                isLoggedIn: true,
                role: 'admin',
                userId: response.user?.id || response.userId,
                name: response.user?.name || '',
                phone: response.user?.phone || identifier
            });

            const successDiv = modal.querySelector('#adminLoginSuccess');
            showSuccess(successDiv, 'Admin verified! Redirecting to panel...');
            btn.textContent = 'Redirecting...';

            setTimeout(() => {
                closeAuthModal();
                window.location.href = '/admin-dashboard.html';
            }, 1500);
        } else {
            showError(errorDiv, 'Access Denied or invalid credentials');
            btn.disabled = false;
            btn.textContent = 'Login as Admin';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(errorDiv, error.message || 'Login failed');
        btn.disabled = false;
        btn.textContent = 'Login as Admin';
    }
}

// Student Signup
async function handleStudentSignupModal(e) {
    e.preventDefault();
    const form = e.target;

    const firstName = form.querySelector('#student-signup-firstName')?.value?.trim();
    const lastName = form.querySelector('#student-signup-lastName')?.value?.trim();
    const phone = form.querySelector('#student-signup-phone')?.value?.trim();
    const email = form.querySelector('#student-signup-email')?.value?.trim();
    const username = form.querySelector('#student-signup-username')?.value?.trim();
    const dobRaw = form.querySelector('#student-signup-dob')?.value; // YYYY-MM-DD
    const classLevel = form.querySelector('#student-signup-class')?.value;
    const section = form.querySelector('#student-signup-section')?.value;
    const fatherName = form.querySelector('#student-signup-fatherName')?.value?.trim();
    const motherName = form.querySelector('#student-signup-motherName')?.value?.trim();

    const errorDiv = form.querySelector('#studentSignupError');
    const successDiv = form.querySelector('#studentSignupSuccess');
    const btn = form.querySelector('#studentSignupBtn');

    clearMessages(errorDiv, successDiv);

    const missing = [
        { val: firstName, name: 'First Name' },
        { val: phone, name: 'Phone' },
        { val: dobRaw, name: 'Date of Birth' },
        { val: classLevel, name: 'Class Level' },
        { val: section, name: 'Section' },
        { val: fatherName, name: 'Father Name' },
        { val: motherName, name: 'Mother Name' }
    ].filter(f => !f.val);

    if (missing.length > 0) {
        showError(errorDiv, `Missing required fields: ${missing.map(m => m.name).join(', ')}`);
        return;
    }

    // Validate username if provided
    if (username) {
        if (username.length < 5) {
            showError(errorDiv, 'Username must be at least 5 characters');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showError(errorDiv, 'Username can only contain letters, numbers, and underscores');
            return;
        }
    }

    // Format YYYY-MM-DD -> DD/MM/YY
    const parts = dobRaw.split('-');
    if (parts.length !== 3 || parts.some(p => !p)) {
        showError(errorDiv, 'Invalid date format. Please use YYYY-MM-DD.');
        return;
    }
    const [yyyy, mm, dd] = parts;
    const yy = yyyy.slice(2);
    const dateOfBirth = `${dd}/${mm}/${yy}`;

    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    try {
        const response = await window.authAPI.register({
            role: 'student',
            firstName,
            lastName,
            phone,
            email: email || null,
            dateOfBirth,
            classLevel,
            section,
            fatherName,
            motherName,
            username: username || undefined
        });

        if (response.success) {
            btn.textContent = 'Sign Up';
            showRegistrationPopup('success',
                'Your student account has been created. An admin will review and activate your account shortly.');
        } else {
            btn.disabled = false;
            btn.textContent = 'Sign Up';
            showRegistrationPopup('error', response.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        btn.disabled = false;
        btn.textContent = 'Sign Up';
        showRegistrationPopup('error', error.message || 'An unexpected error occurred. Please try again.');
    }
}

// Teacher Signup
async function handleTeacherSignupModal(e) {
    e.preventDefault();
    const form = e.target;

    const role = form.querySelector('#teacher-signup-role')?.value?.trim();
    const name = form.querySelector('#teacher-signup-name')?.value?.trim();
    const username = form.querySelector('#teacher-signup-username')?.value?.trim();
    const email = form.querySelector('#teacher-signup-email')?.value?.trim();
    const phone = form.querySelector('#teacher-signup-phone')?.value?.trim();
    const password = form.querySelector('#teacher-signup-password')?.value?.trim();
    const confirmPassword = form.querySelector('#teacher-signup-confirm')?.value?.trim();
    const errorDiv = form.querySelector('#teacherSignupError');
    const successDiv = form.querySelector('#teacherSignupSuccess');
    const btn = form.querySelector('#teacherSignupBtn');

    clearMessages(errorDiv, successDiv);

    if (!role || !name || !email || !phone || !password || !confirmPassword) {
        showError(errorDiv, 'All fields are required');
        return;
    }

    // Validate username if provided
    if (username) {
        if (username.length < 5) {
            showError(errorDiv, 'Username must be at least 5 characters');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showError(errorDiv, 'Username can only contain letters, numbers, and underscores');
            return;
        }
    }

    if (password !== confirmPassword) {
        showError(errorDiv, 'Passwords do not match');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    try {
        const response = await window.authAPI.teacherRegister({
            name,
            email,
            phone,
            password,
            confirmPassword,
            role,
            username: username || undefined
        });

        if (response.success) {
            btn.textContent = 'Sign Up';
            showRegistrationPopup('success',
                'Your account has been created and is awaiting admin approval. You will be able to log in once approved.');
        } else {
            btn.disabled = false;
            btn.textContent = 'Sign Up';
            showRegistrationPopup('error', response.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        btn.disabled = false;
        btn.textContent = 'Sign Up';
        showRegistrationPopup('error', error.message || 'An unexpected error occurred. Please try again.');
    }
}

/**
 * Helper functions
 */

/**
 * Setup real-time username validation on blur
 */
function setupUsernameValidation(modal, inputSelector, statusSelector) {
    const input = modal.querySelector(inputSelector);
    const status = modal.querySelector(statusSelector);
    if (!input || !status) return;

    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const val = input.value.trim();

        if (!val) {
            status.textContent = 'Letters, numbers, and underscores only. Optional but recommended.';
            status.style.color = '#888';
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
        status.style.color = '#888';

        debounceTimer = setTimeout(async () => {
            try {
                const res = await window.authAPI.checkUsername(val);
                if (res.available) {
                    status.textContent = '✅ Username is available';
                    status.style.color = '#16a34a';
                } else {
                    status.textContent = '❌ ' + (res.error || 'Username is taken');
                    status.style.color = '#dc2626';
                }
            } catch {
                status.textContent = 'Could not check availability';
                status.style.color = '#888';
            }
        }, 500);
    });
}

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    element.classList.remove('hidden');

    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

function showSuccess(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    element.classList.remove('hidden');

    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

function clearMessages(errorDiv, successDiv) {
    if (errorDiv) {
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';
    }
    if (successDiv) {
        successDiv.classList.remove('show');
        successDiv.textContent = '';
    }
}

/**
 * Show a full-screen registration result popup
 * @param {'success'|'error'} type
 * @param {string} message
 */
function showRegistrationPopup(type, message) {
    // Remove any existing popup
    const existing = document.getElementById('reg-result-popup');
    if (existing) existing.remove();

    const isSuccess = type === 'success';

    const popup = document.createElement('div');
    popup.id = 'reg-result-popup';
    popup.innerHTML = `
        <div class="reg-popup-overlay"></div>
        <div class="reg-popup-card">
            <div class="reg-popup-icon ${isSuccess ? 'reg-popup-icon--success' : 'reg-popup-icon--error'}">
                <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            </div>
            <h2 class="reg-popup-title">${isSuccess ? 'Registration Successful!' : 'Registration Failed'}</h2>
            <p class="reg-popup-message">${escapeHtml(message)}</p>
            ${isSuccess ? '<div class="reg-popup-badge"><i class="fas fa-clock"></i> Pending Admin Approval</div>' : ''}
            <button class="reg-popup-btn ${isSuccess ? 'reg-popup-btn--success' : 'reg-popup-btn--error'}" id="reg-popup-close">
                ${isSuccess ? 'Got it!' : 'Try Again'}
            </button>
        </div>
    `;

    // Styles injected once
    if (!document.getElementById('reg-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'reg-popup-styles';
        style.textContent = `
            #reg-result-popup {
                position: fixed; inset: 0; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                animation: regPopupFadeIn 0.25s ease;
            }
            @keyframes regPopupFadeIn {
                from { opacity: 0; } to { opacity: 1; }
            }
            .reg-popup-overlay {
                position: absolute; inset: 0;
                background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            }
            .reg-popup-card {
                position: relative; z-index: 1;
                background: #fff; border-radius: 20px;
                padding: 40px 36px; max-width: 420px; width: 90%;
                text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.25);
                animation: regCardSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
            }
            @keyframes regCardSlideUp {
                from { transform: translateY(40px) scale(0.95); opacity: 0; }
                to   { transform: translateY(0) scale(1);       opacity: 1; }
            }
            .reg-popup-icon { font-size: 64px; margin-bottom: 16px; }
            .reg-popup-icon--success { color: #16a34a; }
            .reg-popup-icon--error   { color: #dc2626; }
            .reg-popup-title {
                font-size: 1.5rem; font-weight: 700; margin: 0 0 10px;
                color: #111;
            }
            .reg-popup-message {
                font-size: 0.95rem; color: #555; margin: 0 0 20px; line-height: 1.55;
            }
            .reg-popup-badge {
                display: inline-flex; align-items: center; gap: 6px;
                background: #fef9c3; color: #854d0e;
                border: 1px solid #fde68a; border-radius: 999px;
                padding: 6px 16px; font-size: 0.85rem; font-weight: 600;
                margin-bottom: 24px;
            }
            .reg-popup-btn {
                width: 100%; padding: 13px; border: none; border-radius: 10px;
                font-size: 1rem; font-weight: 600; cursor: pointer;
                transition: transform 0.15s, box-shadow 0.15s;
            }
            .reg-popup-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
            .reg-popup-btn--success { background: #16a34a; color: #fff; }
            .reg-popup-btn--error   { background: #dc2626; color: #fff; }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(popup);

    document.getElementById('reg-popup-close').addEventListener('click', () => {
        popup.style.animation = 'regPopupFadeIn 0.2s ease reverse';
        setTimeout(() => popup.remove(), 200);
        if (isSuccess) closeAuthModal();
    });
}

window.showRegistrationPopup = showRegistrationPopup;

// Export functions for use in HTML onclick handlers
// These MUST be global for inline event handlers (onclick="...") to work
window.openAuthModal = openAuthModal;
window.openAuthLoginSelector = openAuthLoginSelector;
window.openAuthSignupSelector = openAuthSignupSelector;
window.closeAuthModal = closeAuthModal;

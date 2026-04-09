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
                <h3>Teacher</h3>
                <p>Join as a teacher and share knowledge</p>
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
        } else if (role === 'teacher') {
            const form = modal.querySelector('#teacherSignupFormElement');
            if (form) form.addEventListener('submit', handleTeacherSignupModal);
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
    const phone = modal.querySelector('#student-login-phone')?.value?.trim();
    const password = modal.querySelector('#student-login-password')?.value?.trim();
    const errorDiv = modal.querySelector('#studentLoginError');
    const btn = modal.querySelector('#studentLoginBtn');
    
    console.log('🔹 Student Login attempt:', { phone: phone ? '***' : 'empty' });
    
    if (!phone || !password) {
        showError(errorDiv, 'Phone and password are required');
        return;
    }
    
    if (phone.length < 10) {
        showError(errorDiv, 'Phone must be at least 10 digits');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Logging in...';
    
    try {
        const response = await window.authAPI.login(phone, password, 'student');
        
        if (response.success) {
            console.log('✅ Student Login Success:', response.userId);
            window.setAuth({
                isLoggedIn: true,
                role: 'student',
                userId: response.userId || response.user?.id,
                name: response.user?.name || '',
                phone: phone,
                token: response.token
            });
            
            closeAuthModal();
            setTimeout(() => {
                window.location.href = '/student-dashboard.html';
            }, 500);
        } else {
            console.warn('❌ Student Login Failed:', response.error);
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
    const phone = modal.querySelector('#teacher-login-phone')?.value?.trim();
    const password = modal.querySelector('#teacher-login-password')?.value?.trim();
    const errorDiv = modal.querySelector('#teacherLoginError');
    const btn = modal.querySelector('#teacherLoginBtn');
    
    console.log('🔹 Teacher Login attempt:', { phone: phone ? '***' : 'empty' });
    
    if (!phone || !password) {
        showError(errorDiv, 'Phone and password are required');
        return;
    }
    
    if (phone.length < 10) {
        showError(errorDiv, 'Phone must be 10 digits');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    try {
        const response = await window.authAPI.teacherLogin(phone, password);
        
        if (response.success && response.user.role === 'teacher') {
            console.log('✅ Teacher Login Success:', response.userId);
            window.setAuth({
                isLoggedIn: true,
                role: 'teacher',
                userId: response.user?.id || response.userId,
                name: response.user?.name || '',
                phone: phone,
                token: response.token
            });
            
            closeAuthModal();
            setTimeout(() => {
                window.location.href = '/teacher-dashboard.html';
            }, 500);
        } else {
            console.warn('❌ Teacher Login Failed:', response.error);
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
    const phone = modal.querySelector('#admin-login-phone')?.value?.trim();
    const password = modal.querySelector('#admin-login-password')?.value?.trim();
    const errorDiv = modal.querySelector('#adminLoginError');
    const btn = modal.querySelector('#adminLoginBtn');
    
    console.log('🔹 Admin Login attempt:', { phone: phone ? '***' : 'empty' });
    
    if (!phone || !password) {
        showError(errorDiv, 'Phone and password are required');
        return;
    }
    
    if (phone.length < 10) {
        showError(errorDiv, 'Phone must be 10 digits');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    try {
        const response = await window.authAPI.adminLogin(phone, password);
        
        if (response.success && response.user.role === 'admin') {
            console.log('✅ Admin Login Success:', response.userId);
            window.setAuth({
                isLoggedIn: true,
                role: 'admin',
                userId: response.user?.id || response.userId,
                name: response.user?.name || '',
                phone: phone,
                token: response.token
            });
            
            closeAuthModal();
            setTimeout(() => {
                window.location.href = '/admin-dashboard.html';
            }, 500);
        } else {
            console.warn('❌ Admin Login Failed:', response.error);
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
    
    const name = form.querySelector('#student-signup-name')?.value?.trim();
    const phone = form.querySelector('#student-signup-phone')?.value?.trim();
    const password = form.querySelector('#student-signup-password')?.value?.trim();
    const classLevel = form.querySelector('#student-signup-class')?.value;
    const section = form.querySelector('#student-signup-section')?.value;
    const errorDiv = form.querySelector('#studentSignupError');
    const successDiv = form.querySelector('#studentSignupSuccess');
    const btn = form.querySelector('#studentSignupBtn');
    
    console.log('🔹 Student Signup attempt:', { name, phone, classLevel, section });
    
    clearMessages(errorDiv, successDiv);
    
    if (!name || !phone || !password || !classLevel) {
        console.warn('⚠️ Student Signup missing fields:', { name, phone, password: password?'***':'empty', classLevel, section });
        showError(errorDiv, 'All fields are required');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Creating Account...';
    
    try {
        const response = await window.authAPI.register({
            name,
            phone,
            password,
            classLevel,
            section
        });
        
        if (response.success) {
            showSuccess(successDiv, 'Account created successfully! Redirecting...');
            closeAuthModal();
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showError(errorDiv, response.error || 'Signup failed');
            btn.disabled = false;
            btn.textContent = 'Sign Up';
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError(errorDiv, error.message || 'Signup failed');
        btn.disabled = false;
        btn.textContent = 'Sign Up';
    }
}

// Teacher Signup
async function handleTeacherSignupModal(e) {
    e.preventDefault();
    const form = e.target;
    
    const name = form.querySelector('#teacher-signup-name')?.value?.trim();
    const email = form.querySelector('#teacher-signup-email')?.value?.trim();
    const phone = form.querySelector('#teacher-signup-phone')?.value?.trim();
    const password = form.querySelector('#teacher-signup-password')?.value?.trim();
    const confirmPassword = form.querySelector('#teacher-signup-confirm')?.value?.trim();
    const errorDiv = form.querySelector('#teacherSignupError');
    const successDiv = form.querySelector('#teacherSignupSuccess');
    const btn = form.querySelector('#teacherSignupBtn');
    
    console.log('🔹 Teacher Signup attempt:', { name, email, phone });
    
    clearMessages(errorDiv, successDiv);
    
    if (!name || !email || !phone || !password || !confirmPassword) {
        console.warn('⚠️ Teacher Signup missing fields:', { 
            name: name || 'MISSING', 
            email: email || 'MISSING', 
            phone: phone || 'MISSING', 
            password: password ? 'OK' : 'MISSING', 
            confirmPassword: confirmPassword ? 'OK' : 'MISSING' 
        });
        showError(errorDiv, 'All fields are required');
        return;
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
            confirmPassword
        });
        
        if (response.success) {
            showSuccess(successDiv, '✅ Account created! Awaiting admin approval...');
            closeAuthModal();
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } else {
            showError(errorDiv, response.error || 'Signup failed');
            btn.disabled = false;
            btn.textContent = 'Sign Up';
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError(errorDiv, error.message || 'Signup failed');
        btn.disabled = false;
        btn.textContent = 'Sign Up';
    }
}

/**
 * Helper functions
 */

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

// Export functions for use in HTML onclick handlers
window.openAuthModal = openAuthModal;
window.openAuthLoginSelector = openAuthLoginSelector;
window.openAuthSignupSelector = openAuthSignupSelector;
window.closeAuthModal = closeAuthModal;

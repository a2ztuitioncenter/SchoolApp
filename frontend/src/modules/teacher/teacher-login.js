/**
 * teacher-login.js - Teacher authentication
 */

import { authAPI } from '../../core/api.js';
import { setAuth, syncToSessionStorage } from '../../core/auth-manager.js';

/**
 * Handle teacher login
 */
export async function handleTeacherLogin() {
  const phoneInput = document.getElementById('teacher-phone');
  const passwordInput = document.getElementById('teacher-password');
  const phone = phoneInput?.value?.trim();
  const password = passwordInput?.value?.trim();

  if (!phone || phone.length < 10) {
    showError('Please enter a valid 10-digit phone number');
    return;
  }

  if (!password) {
    showError('Please enter your password');
    return;
  }

  try {
    const loginBtn = document.getElementById('teacher-login-btn');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Verifying...';
    }

    // Call teacher login endpoint
    const response = await authAPI.teacherLogin(phone, password);

    if (response.success && response.user && response.user.role === 'teacher') {
      showSuccess('Teacher verified! Redirecting...');
      
      // Store auth state in centralized manager
      setAuth({
        role: 'teacher',
        userId: response.user.id,
        name: response.user.name,
        phone: phone
      });

      // Sync to sessionStorage for backward compatibility
      syncToSessionStorage('teacher');

      // Redirect to teacher dashboard
      setTimeout(() => {
        window.location.href = '/teacher-dashboard.html';
      }, 500);
      
    } else if (response.user && response.user.role !== 'teacher') {
      showError('Access Denied: This account does not have teacher privileges.');
    } else {
      showError('Login failed. Please check your credentials.');
    }
  } catch (error) {
    console.error('[AUTH] Teacher Login error:', error);
    showError(error.message || 'An error occurred during login');
  } finally {
    const loginBtn = document.getElementById('teacher-login-btn');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login as Teacher';
    }
  }
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  const successDiv = document.getElementById('success-message');
  
  if (successDiv) successDiv.style.display = 'none';
  
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  const successDiv = document.getElementById('success-message');
  const errorDiv = document.getElementById('error-message');
  
  if (errorDiv) errorDiv.style.display = 'none';
  
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
  }
}

// Auto-bind to button
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('teacher-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleTeacherLogin);
  }
  
  // Allow Enter key to submit
  document.getElementById('teacher-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleTeacherLogin();
    }
  });
});

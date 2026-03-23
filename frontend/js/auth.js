/**
 * auth.js - Handle login and authentication flow
 * Called from index.html login form
 */

import { authAPI } from './api.js';

/**
 * Handle student login form submission
 */
export async function handleStudentLogin(event) {
  event.preventDefault();

  const phoneInput = document.getElementById('phone-input');
  const phone = phoneInput?.value?.trim();

  if (!phone || phone.length < 10) {
    showError('Please enter a valid 10-digit phone number');
    return;
  }

  try {
    // Show loading state
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
    }

    // Call backend login endpoint
    const response = await authAPI.login(phone, 'student');

    if (response.success && response.userId) {
      // Store user data
      sessionStorage.setItem('studentUserId', response.userId);
      sessionStorage.setItem('studentRole', response.user?.role || 'student');
      sessionStorage.setItem('studentPhone', phone);
      if (response.student?.name) {
        sessionStorage.setItem('studentName', response.student.name);
      }

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/pages/student-dashboard.html';
      }, 500);
    } else {
      showError(response.error || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    showError(error.message || 'An error occurred during login');
  } finally {
    // Reset button state
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  }
}

/**
 * Show error message to user
 */
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// Auto-bind to form if available
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleStudentLogin);
  }
});

/**
 * login.js - Handle student login form submission
 */

import { authAPI } from './api.js';

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

async function handleLogin(event) {
  event.preventDefault();

  const phoneInput = document.getElementById('phone');
  const phone = phoneInput?.value?.trim();
  const errorDiv = document.getElementById('errorMessage');
  const submitBtn = document.getElementById('submitBtn');

  // Clear previous errors
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }

  if (!phone || phone.length < 10) {
    showError('Please enter a valid 10-digit phone number');
    return;
  }

  try {
    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
    }

    // Call backend login endpoint
    const response = await authAPI.login(phone, 'student');

    if (response && response.success && response.userId) {
      // Store user data in sessionStorage
      sessionStorage.setItem('studentUserId', response.userId);
      sessionStorage.setItem('studentRole', response.role || 'Student');
      sessionStorage.setItem('studentPhone', phone);
      
      if (response.user?.name) {
        sessionStorage.setItem('studentName', response.user.name);
      }

      if (response.token) {
        sessionStorage.setItem('authToken', response.token);
      }

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/pages/student-dashboard.html';
      }, 500);
    } else {
      showError(response?.error || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    showError(error.message || 'An error occurred during login. Please try again.');
  } finally {
    // Reset button state
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

export { handleLogin };

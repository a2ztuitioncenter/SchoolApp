/**
 * admin-login.js - Admin authentication
 */

import { authAPI } from './api.js';

/**
 * Handle admin login
 */
export async function handleAdminLogin() {
  const phoneInput = document.getElementById('admin-phone');
  const passwordInput = document.getElementById('admin-password');
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
    const loginBtn = document.getElementById('admin-login-btn');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Verifying...';
    }

    // Call admin login endpoint
    const response = await authAPI.adminLogin(phone, password);

    if (response.success && response.user && response.user.role === 'admin') {
      showSuccess('Admin verified! Redirecting...');
      
      // Store admin session
      sessionStorage.setItem('adminUserId', response.user.id);
      sessionStorage.setItem('adminRole', response.user.role);
      sessionStorage.setItem('adminPhone', phone);

      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.href = '/admin-dashboard.html';
      }, 1000);
      
    } else if (response.user && response.user.role !== 'admin') {
      showError('Access Denied: This account does not have admin privileges.');
    } else {
      showError('Login failed. Please check your credentials.');
    }
  } catch (error) {
    console.error('❌ Admin Login error:', error);
    showError(error.message || 'An error occurred during login');
  } finally {
    const loginBtn = document.getElementById('admin-login-btn');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login as Admin';
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
  const loginBtn = document.getElementById('admin-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleAdminLogin);
  }
  
  // Allow Enter key to submit
  document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAdminLogin();
    }
  });
});

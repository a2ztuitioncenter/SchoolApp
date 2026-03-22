/**
 * admin-dashboard.js - Admin dashboard functionality
 */

import { adminAPI } from './api.js';

// Current tab state
let currentTab = 'dashboard';

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in as admin
  const adminId = sessionStorage.getItem('adminUserId');
  const adminRole = sessionStorage.getItem('adminRole');
  
  if (!adminId || adminRole !== 'admin') {
    window.location.href = '/admin-login.html';
    return;
  }

  // Display admin info
  const adminPhone = sessionStorage.getItem('adminPhone');
  document.getElementById('admin-name').textContent = `Admin (${adminPhone})`;

  // Setup tab navigation
  setupTabNavigation();

  // Setup forms
  setupForms();

  // Load initial data
  await loadDashboardData();
});

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const tabButtons = document.querySelectorAll('[data-tab]');

  const switchTab = (tabName) => {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-button, .nav-link').forEach(btn => {
      btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }

    // Update active class
    document.querySelectorAll('[data-tab="' + tabName + '"]').forEach(btn => {
      btn.classList.add('active');
    });

    currentTab = tabName;

    // Load data based on tab
    if (tabName === 'users') {
      loadUsers();
    } else if (tabName === 'students') {
      loadStudents();
    } else if (tabName === 'financials') {
      loadFinancials();
    }
  };

  // Sidebar nav links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = link.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

/**
 * Setup form submission handlers
 */
function setupForms() {
  // Add user form
  document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
      name: document.getElementById('user-name').value,
      phone: document.getElementById('user-phone').value,
      email: document.getElementById('user-email').value,
      role: document.getElementById('user-role').value,
    };

    try {
      showInfoAlert('Adding user...');
      const response = await adminAPI.addUser(userData);
      
      if (response.success) {
        showSuccessAlert('User added successfully!');
        document.getElementById('add-user-form').reset();
        await loadUsers();
      } else {
        showErrorAlert(response.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      showErrorAlert(error.message);
    }
  });

  // Add student form
  document.getElementById('add-student-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentData = {
      name: `${document.getElementById('student-firstName').value} ${document.getElementById('student-lastName').value}`,
      phone: document.getElementById('student-phone').value,
      email: document.getElementById('student-email').value,
      classLevel: document.getElementById('student-classLevel').value,
      section: document.getElementById('student-section').value,
      fatherName: document.getElementById('student-fatherName').value,
      motherName: document.getElementById('student-motherName').value,
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    try {
      showInfoAlert('Onboarding student...');
      const response = await adminAPI.addStudent(studentData);
      
      if (response.success) {
        showSuccessAlert('Student onboarded successfully!');
        document.getElementById('add-student-form').reset();
        await loadStudents();
      } else {
        showErrorAlert(response.error || 'Failed to onboard student');
      }
    } catch (error) {
      console.error('Error onboarding student:', error);
      showErrorAlert(error.message);
    }
  });

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('adminUserId');
    sessionStorage.removeItem('adminRole');
    sessionStorage.removeItem('adminPhone');
    window.location.href = '/admin-login.html';
  });
}

/**
 * Load dashboard summary data
 */
async function loadDashboardData() {
  try {
    const [students, unpaidFees] = await Promise.all([
      adminAPI.getStudents(),
      adminAPI.getUnpaidFees(),
    ]);

    // Display total students
    document.getElementById('total-students').textContent = students.students?.length || 0;

    // Calculate unpaid totals
    const unpaidData = unpaidFees.fees || [];
    const totalUnpaid = unpaidData.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
    document.getElementById('total-unpaid').textContent = `₹${totalUnpaid.toLocaleString()}`;

    // Count overdue (assume fees overdue if dueDate is in the past)
    const today = new Date();
    const overdueCount = unpaidData.filter(fee => new Date(fee.duedate) < today).length;
    document.getElementById('overdue-count').textContent = overdueCount;

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

/**
 * Load and display all users
 */
async function loadUsers() {
  try {
    const response = await adminAPI.getUsers();
    const usersList = document.getElementById('users-list');
    const users = response.users || [];

    if (users.length === 0) {
      usersList.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No users found. Add a new user to get started.</p>
          </td>
        </tr>
      `;
      return;
    }

    usersList.innerHTML = users.map(user => `
      <tr>
        <td>${user.name || 'N/A'}</td>
        <td>${user.phone}</td>
        <td><span class="status-badge" style="background: #D6EAF8; color: #154360;">${user.role}</span></td>
        <td><span class="status-badge status-active">${user.isactive ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading users:', error);
    showErrorAlert('Failed to load users');
  }
}

/**
 * Load and display all students
 */
async function loadStudents() {
  try {
    const response = await adminAPI.getStudents();
    const studentsList = document.getElementById('students-list');
    const students = response.students || [];

    if (students.length === 0) {
      studentsList.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No students found. Onboard a student to get started.</p>
          </td>
        </tr>
      `;
      return;
    }

    studentsList.innerHTML = students.map(student => `
      <tr>
        <td>${student.name}</td>
        <td>${student.phone}</td>
        <td>${student.classlevel || 'N/A'}</td>
        <td>
          <span class="status-badge ${student.status === 'active' ? 'status-active' : 'status-pending'}">
            ${student.status}
          </span>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading students:', error);
    showErrorAlert('Failed to load students');
  }
}

/**
 * Load and display unpaid fees
 */
async function loadFinancials() {
  try {
    const response = await adminAPI.getUnpaidFees();
    const financialsList = document.getElementById('financials-list');
    const fees = response.fees || [];

    if (fees.length === 0) {
      financialsList.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <i class="fas fa-check-circle"></i>
            <p>All fees are paid! No outstanding payments.</p>
          </td>
        </tr>
      `;
      return;
    }

    const today = new Date();
    financialsList.innerHTML = fees.map(fee => {
      const dueDate = new Date(fee.duedate);
      const isOverdue = dueDate < today;
      const statusClass = isOverdue ? 'status-overdue' : 'status-pending';
      const statusText = isOverdue ? 'Overdue' : 'Pending';

      return `
        <tr>
          <td>${fee.student_name || 'Unknown'}</td>
          <td>${fee.phone || 'N/A'}</td>
          <td>${fee.classlevel || 'N/A'}</td>
          <td>₹${parseFloat(fee.amount).toLocaleString()}</td>
          <td>${new Date(fee.duedate).toLocaleDateString()}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading financials:', error);
    showErrorAlert('Failed to load financial data');
  }
}

/**
 * Alert helper functions
 */
function showSuccessAlert(message) {
  const alert = document.getElementById('success-alert');
  if (alert) {
    document.getElementById('success-text').textContent = message;
    alert.style.display = 'block';
    setTimeout(() => alert.style.display = 'none', 4000);
  }
}

function showErrorAlert(message) {
  const alert = document.getElementById('error-alert');
  if (alert) {
    document.getElementById('error-text').textContent = message;
    alert.style.display = 'block';
    setTimeout(() => alert.style.display = 'none', 4000);
  }
}

function showInfoAlert(message) {
  const alert = document.getElementById('info-alert');
  if (alert) {
    document.getElementById('info-text').textContent = message;
    alert.style.display = 'block';
  }
}

// Export functions for debugging
export { loadDashboardData, loadUsers, loadStudents, loadFinancials };

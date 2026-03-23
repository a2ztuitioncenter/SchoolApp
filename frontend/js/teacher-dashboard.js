/**
 * teacher-dashboard.js - Teacher dashboard functionality
 */

import { teacherAPI } from './api.js';

let currentTab = 'dashboard';

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in as teacher
  const teacherId = sessionStorage.getItem('teacherId');
  const teacherRole = sessionStorage.getItem('teacherRole');
  
  if (!teacherId || teacherRole !== 'teacher') {
    window.location.href = '/teacher-login.html';
    return;
  }

  // Display teacher info
  const teacherPhone = sessionStorage.getItem('teacherPhone');
  document.getElementById('teacher-name').textContent = `Teacher (${teacherPhone})`;

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
    if (tabName === 'homework') {
      loadHomework();
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
  // Add homework form
  document.getElementById('add-homework-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const teacherId = sessionStorage.getItem('teacherId');
    const homeworkData = {
      teacherId: parseInt(teacherId),
      classLevel: document.getElementById('class-level').value,
      section: document.getElementById('section').value,
      subject: document.getElementById('subject').value,
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      dueDate: document.getElementById('due-date').value,
    };

    try {
      showInfoAlert('Adding homework...');
      const response = await teacherAPI.addHomework(homeworkData);
      
      if (response.success) {
        showSuccessAlert('Homework added successfully!');
        document.getElementById('add-homework-form').reset();
        await loadHomework();
      } else {
        showErrorAlert(response.error || 'Failed to add homework');
      }
    } catch (error) {
      console.error('Error adding homework:', error);
      showErrorAlert(error.message);
    }
  });

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('teacherId');
    sessionStorage.removeItem('teacherRole');
    sessionStorage.removeItem('teacherPhone');
    window.location.href = '/teacher-login.html';
  });
}

/**
 * Load dashboard summary data
 */
async function loadDashboardData() {
  try {
    console.log('📊 Loading teacher dashboard data...');
    const teacherId = sessionStorage.getItem('teacherId');
    
    if (!teacherId) {
      console.error('No teacherId found in session');
      return;
    }

    const response = await teacherAPI.getDashboard(teacherId);

    console.log('✅ Dashboard response:', response);

    if (response.success) {
      // Display stats
      const totalClassesEl = document.getElementById('total-classes');
      const totalStudentsEl = document.getElementById('total-students');
      const totalHomeworkEl = document.getElementById('total-homework');

      if (totalClassesEl) totalClassesEl.textContent = response.stats?.totalClasses || 0;
      if (totalStudentsEl) totalStudentsEl.textContent = response.stats?.totalStudents || 0;
      if (totalHomeworkEl) totalHomeworkEl.textContent = response.stats?.totalHomework || 0;

      // Display classes
      const classesList = document.getElementById('classes-list');
      const classes = response.classes || [];

      if (classes.length === 0) {
        classesList.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>No classes assigned yet.</p>
            </td>
          </tr>
        `;
        return;
      }

      classesList.innerHTML = classes.map(cls => {
        const homeworkCount = (response.homework || []).filter(
          hw => hw.classLevel === cls.classLevel && hw.section === cls.section
        ).length;

        return `
          <tr>
            <td>${cls.classLevel}</td>
            <td>${cls.section || 'N/A'}</td>
            <td>${response.stats?.totalStudents || 0}</td>
            <td><span class="status-badge status-active">${homeworkCount}</span></td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showErrorAlert('Failed to load dashboard data: ' + error.message);
  }
}

/**
 * Load and display homework
 */
async function loadHomework() {
  try {
    console.log('📝 Loading homework data...');
    const teacherId = sessionStorage.getItem('teacherId');
    
    if (!teacherId) {
      console.error('No teacherId found in session');
      return;
    }

    const response = await teacherAPI.getDashboard(teacherId);
    console.log('✅ Homework response:', response);

    if (response.success) {
      const homeworkList = document.getElementById('homework-list');
      const homework = response.homework || [];

      if (homework.length === 0) {
        homeworkList.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">
              <i class="fas fa-clipboard"></i>
              <p>No homework assignments yet.</p>
            </td>
          </tr>
        `;
        return;
      }

      homeworkList.innerHTML = homework.map(hw => {
        const today = new Date();
        const dueDate = new Date(hw.dueDate || hw.duedate);
        const isOverdue = dueDate < today;
        const statusClass = isOverdue ? 'status-pending' : 'status-active';
        const statusText = isOverdue ? 'Overdue' : 'Active';

        return `
          <tr>
            <td>${hw.classLevel}${hw.section ? '-' + hw.section : ''}</td>
            <td>${hw.title}</td>
            <td>${new Date(hw.dueDate || hw.duedate).toLocaleDateString()}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    } else {
      console.error('API returned success: false', response);
      showErrorAlert('Failed to load homework: ' + (response.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error loading homework:', error);
    showErrorAlert('Failed to load homework: ' + error.message);
    
    // Display empty state on error
    const homeworkList = document.getElementById('homework-list');
    if (homeworkList) {
      homeworkList.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading homework data</p>
          </td>
        </tr>
      `;
    }
  }
}
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
export { loadDashboardData, loadHomework };

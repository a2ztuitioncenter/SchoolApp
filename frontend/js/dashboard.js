/**
 * dashboard.js - Wire up the student.html with API calls
 * Fetches data on page load and populates DOM elements
 */

import { studentAPI, getAuthToken, setAuthToken } from './api.js';

// ===========================
// Initialization on Page Load
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 Dashboard initializing...');

  try {
    // Get userId from sessionStorage (set during login)
    // For development, we'll use a mock userId
    let userId = sessionStorage.getItem('studentUserId');

    if (!userId) {
      // For demo purposes, use a default student ID
      // In production, redirect to login if not authenticated
      userId = 'demo-student-001';
      sessionStorage.setItem('studentUserId', userId);
      console.log('⚠️  Using demo student ID:', userId);
    }

    // Fetch and populate dashboard data
    await loadDashboardData(userId);
  } catch (error) {
    console.error('❌ Dashboard initialization failed:', error);
    showErrorMessage('Failed to load dashboard. Please refresh the page.');
  }
});

/**
 * Main function to fetch and populate all dashboard data
 */
async function loadDashboardData(userId) {
  try {
    console.log(`📊 Fetching dashboard data for user: ${userId}`);

    // Fetch data from backend
    const dashboardResponse = await studentAPI.getDashboard(userId);

    if (!dashboardResponse.success) {
      throw new Error('Failed to fetch dashboard data');
    }

    const { data } = dashboardResponse;

    // Populate student profile
    populateProfile(data.profile);

    // Populate attendance
    populateAttendance(data.attendance);

    // Populate fees
    populateFees(data.fees);

    // Populate homework
    populateHomework(data.homework);

    // Populate course progress
    populateCourseProgress(data.courseProgress);

    console.log('✅ Dashboard loaded successfully');
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showErrorMessage('Unable to load dashboard data');
  }
}

/**
 * Populate student profile section (name, class, section)
 */
function populateProfile(profile) {
  try {
    const nameElement = document.getElementById('student-name');
    const classElement = document.getElementById('student-class');

    if (nameElement) {
      nameElement.textContent = profile.name || 'Student';
    }

    if (classElement) {
      classElement.textContent = `Class: ${profile.classLevel} | Section: ${profile.section}`;
    }

    console.log('✅ Profile populated:', profile.name);
  } catch (error) {
    console.error('❌ Error populating profile:', error);
  }
}

/**
 * Populate attendance statistics
 */
function populateAttendance(attendance) {
  try {
    const attendanceDisplay = document.getElementById('attendance-display');

    if (attendanceDisplay) {
      const percentage = attendance.percentage || 0;
      const present = attendance.presentDays || 0;
      const total = attendance.totalDays || 0;

      attendanceDisplay.textContent = `Present: ${present}/${total} days (${percentage}%)`;
    }

    console.log('✅ Attendance populated:', attendance.percentage + '%');
  } catch (error) {
    console.error('❌ Error populating attendance:', error);
  }
}

/**
 * Populate fees status
 */
function populateFees(fees) {
  try {
    const feesDisplay = document.getElementById('fees-display');

    if (feesDisplay) {
      const pending = fees.totalPending || 0;
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(pending);

      feesDisplay.textContent = `Pending: ${formatted}`;
    }

    console.log('✅ Fees populated: Pending ₹' + fees.totalPending);
  } catch (error) {
    console.error('❌ Error populating fees:', error);
  }
}

/**
 * Populate homework items
 */
function populateHomework(homework) {
  try {
    const homeworkContainer = document.getElementById('homework-container');

    if (!homeworkContainer) {
      console.warn('⚠️  homework-container element not found');
      return;
    }

    // Clear existing items (except template)
    homeworkContainer.innerHTML = '';

    if (!homework || homework.length === 0) {
      homeworkContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No homework assigned</p>';
      return;
    }

    // Create homework item for each assignment
    homework.forEach((item, index) => {
      const homeworkHTML = createHomeworkItemHTML(item, index);
      homeworkContainer.innerHTML += homeworkHTML;
    });

    console.log('✅ Homework populated:', homework.length, 'items');
  } catch (error) {
    console.error('❌ Error populating homework:', error);
  }
}

/**
 * Generate HTML for a single homework item
 */
function createHomeworkItemHTML(item, index) {
  const subjectColor = index % 2 === 0 ? 'math' : 'science';
  const iconContent = index % 2 === 0 ? '📐' : '⚗️';

  return `
    <div class="homework-item">
      <div class="subject-icon ${subjectColor}">${iconContent}</div>
      <div class="details">
        <p class="subject-title">${item.subject} - ${item.topic}</p>
        <p class="due-date"><i class="fas fa-pencil-alt"></i> Due: ${formatDate(item.dueDate)}</p>
      </div>
    </div>
  `;
}

/**
 * Populate course progress circular indicator
 */
function populateCourseProgress(courseProgress) {
  try {
    const progressCircle = document.getElementById('course-progress');

    if (progressCircle) {
      const percentage = courseProgress.percentage || 75;
      progressCircle.style.setProperty('--percent', percentage);

      const innerText = progressCircle.querySelector('.inner-text');
      if (innerText) {
        innerText.textContent = percentage + '%';
      }
    }

    console.log('✅ Course progress populated:', courseProgress.percentage + '%');
  } catch (error) {
    console.error('❌ Error populating course progress:', error);
  }
}

/**
 * Format date string to readable format (DD/MM/YY)
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
  const content = document.querySelector('.content');
  if (content) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: #FADBD8;
      color: #78281F;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border-left: 4px solid #E74C3C;
    `;
    errorDiv.textContent = '⚠️ ' + message;
    content.prepend(errorDiv);
  }
}

// ===========================
// Utility Functions
// ===========================

/**
 * Logout function (clears session)
 */
export function logout() {
  sessionStorage.removeItem('studentUserId');
  sessionStorage.removeItem('authToken');
  window.location.href = '/index.html';
}

/**
 * student-dashboard.js - Wire up the student dashboard with API calls
 * Fetches data on page load and populates DOM elements
 */

import { studentAPI } from './api.js';


// ===========================
// Initialization on Page Load
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 Dashboard initializing...');

  try {
    // Get userId from sessionStorage (set during login)
    let userId = sessionStorage.getItem('studentUserId');

    if (!userId) {
      console.warn('⚠️ No userId found in sessionStorage, redirecting to login...');
      window.location.href = '/student-login.html';
      return;
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

    if (!dashboardResponse || !dashboardResponse.success) {
      if (dashboardResponse?.error === 'Student record not found') {
        showErrorMessage('Your student profile is being set up. Please try again in a moment.');
        setTimeout(() => { window.location.href = '/student-login.html'; }, 3000);
        return;
      }
      throw new Error(dashboardResponse?.error || 'Failed to fetch dashboard data');
    }

    const { data } = dashboardResponse;
    if (!data) throw new Error('No data received from server');

    if (data.profile) populateProfile(data.profile);
    if (data.attendance) populateAttendance(data.attendance);
    if (data.fees) populateFees(data.fees);
    if (data.homework) populateHomework(data.homework);
    if (data.courseProgress) populateCourseProgress(data.courseProgress);

    console.log('✅ Dashboard loaded successfully');
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showErrorMessage('Unable to load dashboard data: ' + error.message);
  }
}

function populateProfile(profile) {
  const nameElement = document.getElementById('student-name');
  const classElement = document.getElementById('student-class');
  if (nameElement && profile.name) nameElement.textContent = profile.name;
  if (classElement && profile.classLevel) {
    classElement.textContent = `Class: ${profile.classLevel} | Section: ${profile.section || 'N/A'}`;
  }
}

function populateAttendance(attendance) {
  const attendanceDisplay = document.getElementById('attendance-display');
  if (attendanceDisplay && attendance.presentDays !== undefined) {
    const total = attendance.totalDays || 30;
    attendanceDisplay.textContent = `Present: ${attendance.presentDays}/${total} days (${attendance.percentage}%)`;
  }
}

function populateFees(fees) {
  const feesDisplay = document.getElementById('fees-display');
  if (feesDisplay && fees.totalPending !== undefined) {
    feesDisplay.textContent = `Pending: ₹${(fees.totalPending || 0).toLocaleString()}`;
  }
}

function populateHomework(homework) {
  const container = document.getElementById('homework-container');
  if (!container) return;
  if (!Array.isArray(homework) || homework.length === 0) {
    container.innerHTML = '<p class="no-data">No homework assigned</p>';
    return;
  }
  container.innerHTML = homework.map((hw, idx) => `
    <div class="homework-item">
      <div class="subject-icon">${getSubjectIcon(hw.subject)}</div>
      <div class="details">
        <p class="subject-title">${hw.subject || 'Homework'} - ${hw.title || 'Assignment'}</p>
        <p class="due-date"><i class="fas fa-pencil-alt"></i> Due: ${formatDate(hw.dueDate)}</p>
      </div>
    </div>
  `).join('');
}

function populateCourseProgress(progress) {
  const progressCircle = document.getElementById('course-progress');
  if (progressCircle && progress.percentage !== undefined) {
    const percent = progress.percentage;
    progressCircle.style.setProperty('--percent', percent);
    const innerText = progressCircle.querySelector('.inner-text');
    if (innerText) innerText.textContent = `${percent}%`;
  }
}

function getSubjectIcon(subject) {
  const s = (subject || '').toLowerCase();
  if (s.includes('math')) return '📐';
  if (s.includes('science')) return '🔬';
  if (s.includes('english')) return '📚';
  if (s.includes('history')) return '📜';
  if (s.includes('geography')) return '🗺️';
  return '📝';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) { return dateStr; }
}

function showErrorMessage(message) {
  const content = document.querySelector('.content');
  if (content) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-alert-box';
    errorDiv.style.cssText = `background:#FADBD8;color:#78281F;padding:1rem;border-radius:8px;margin-bottom:1rem;border-left:4px solid #E74C3C;`;
    errorDiv.textContent = '⚠️ ' + message;
    content.prepend(errorDiv);
  }
}

export function logout() {
  sessionStorage.removeItem('studentUserId');
  sessionStorage.removeItem('authToken');
  window.location.href = '/';
}

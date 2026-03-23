/**
 * dashboard.js - Wire up the student dashboard with API calls
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
      console.warn('⚠️  No userId found in sessionStorage, redirecting to login...');
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
      // If student record not found, show friendly message
      if (dashboardResponse?.error === 'Student record not found') {
        showErrorMessage('Your student profile is being set up. Please try again in a moment.');
        console.warn('⚠️  Student record not found, will refresh:', dashboardResponse?.error);
        
        // Optionally redirect to login after delay
        setTimeout(() => {
          window.location.href = '/student-login.html';
        }, 3000);
        return;
      }
      
      throw new Error(dashboardResponse?.error || 'Failed to fetch dashboard data');
    }

    const { data } = dashboardResponse;

    if (!data) {
      throw new Error('No data received from server');
    }

    // Populate student profile
    if (data.profile) {
      populateProfile(data.profile);
    }

    // Populate attendance
    if (data.attendance) {
      populateAttendance(data.attendance);
    }

    // Populate fees
    if (data.fees) {
      populateFees(data.fees);
    }

    // Populate homework
    if (data.homework) {
      populateHomework(data.homework);
    }

    // Populate course progress
    if (data.courseProgress) {
      populateCourseProgress(data.courseProgress);
    }

    console.log('✅ Dashboard loaded successfully');
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showErrorMessage('Unable to load dashboard data: ' + error.message);
  }
}

/**
 * Populate student profile section (name, class, section)
 */
function populateProfile(profile) {
  try {
    const nameElement = document.getElementById('student-name');
    const classElement = document.getElementById('student-class');

    if (nameElement && profile.name) {
      nameElement.textContent = profile.name;
    }

    if (classElement && profile.classLevel) {
      classElement.textContent = `Class: ${profile.classLevel} | Section: ${profile.section || 'N/A'}`;
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
    
    if (attendanceDisplay && attendance.presentDays !== undefined) {
      const total = attendance.totalDays || 30;
      attendanceDisplay.textContent = `Present: ${attendance.presentDays}/${total} days (${attendance.percentage}%)`;
    }

    console.log('✅ Attendance populated');
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
    
    if (feesDisplay && fees.totalPending !== undefined) {
      const pending = fees.totalPending || 0;
      feesDisplay.textContent = `Pending: ₹${pending.toLocaleString()}`;
    }

    console.log('✅ Fees populated');
  } catch (error) {
    console.error('❌ Error populating fees:', error);
  }
}

/**
 * Populate homework section
 */
function populateHomework(homework) {
  try {
    const homeworkContainer = document.getElementById('homework-container');
    
    if (!homeworkContainer) return;

    if (!Array.isArray(homework) || homework.length === 0) {
      homeworkContainer.innerHTML = '<p class="no-data">No homework assigned</p>';
      return;
    }

    let html = '';
    homework.forEach((hw, idx) => {
      const subjectIcon = getSubjectIcon(hw.subject || `Subject ${idx + 1}`);
      html += `
        <div class="homework-item">
          <div class="subject-icon">${subjectIcon}</div>
          <div class="details">
            <p class="subject-title">${hw.subject || 'Homework'} - ${hw.topic || hw.title || 'Assignment'}</p>
            <p class="due-date"><i class="fas fa-pencil-alt"></i> Due: ${formatDate(hw.dueDate)}</p>
          </div>
        </div>
      `;
    });

    homeworkContainer.innerHTML = html;
    console.log('✅ Homework populated:', homework.length, 'items');
  } catch (error) {
    console.error('❌ Error populating homework:', error);
  }
}

/**
 * Populate course progress
 */
function populateCourseProgress(progress) {
  try {
    const progressCircle = document.getElementById('course-progress');
    
    if (progressCircle && progress.percentage !== undefined) {
      const percent = progress.percentage;
      progressCircle.style.setProperty('--percent', percent);
      
      const innerText = progressCircle.querySelector('.inner-text');
      if (innerText) {
        innerText.textContent = `${percent}%`;
      }
    }

    console.log('✅ Course progress populated:', progress.percentage, '%');
  } catch (error) {
    console.error('❌ Error populating progress:', error);
  }
}

/**
 * Helper: Get subject icon
 */
function getSubjectIcon(subject) {
  const subjectLower = (subject || '').toLowerCase();
  
  if (subjectLower.includes('math')) return '📐';
  if (subjectLower.includes('science')) return '🔬';
  if (subjectLower.includes('english')) return '📚';
  if (subjectLower.includes('history')) return '📜';
  if (subjectLower.includes('geography')) return '🗺️';
  
  return '📝';
}

/**
 * Helper: Format date
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
  console.error('⚠️ Error:', message);
  
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

/**
 * Logout function (clears session)
 */
export function logout() {
  sessionStorage.removeItem('studentUserId');
  sessionStorage.removeItem('authToken');
  window.location.href = '/';
}

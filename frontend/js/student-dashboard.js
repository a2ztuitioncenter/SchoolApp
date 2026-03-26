/**
 * student-dashboard.js - Wire up the student dashboard with API calls
 * Fetches data on page load and populates DOM elements
 */

import { studentAPI, downloadFile, materialsAPI } from './api.js';


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

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
      // Close sidebar when clicking a link on mobile
      document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
          }
        });
      });
    }

    // Fetch and populate dashboard data
    const dashboardData = await loadDashboardData(userId);
    if (dashboardData && dashboardData.data && dashboardData.data.profile) {
        const profile = dashboardData.data.profile;
        console.log(`🎓 Student Profile loaded. Class: ${profile.classLevel}`);
        await loadMaterials(profile.classLevel);
    }

    // Tab Switching Logic
    setupTabSwitching();
  } catch (error) {
    console.error('❌ Dashboard initialization failed:', error);
    showErrorMessage('Failed to load dashboard. Please refresh the page.');
  }
});

function setupTabSwitching() {
  const navLinks = document.querySelectorAll('.sidebar nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      if (!tabId) return;

      // Update Active class
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update Visibility
      document.querySelectorAll('.tab-content, .content').forEach(el => el.style.display = 'none');
      const target = document.getElementById(`tab-${tabId}`) || document.getElementById(tabId);
      if (target) {
          target.style.display = 'block';
          console.log(`📂 Switched to tab: ${tabId}`);
      }

      if (tabId === 'materials') {
        const classText = document.getElementById('student-class')?.innerText || '';
        console.log(`🔍 Class text for materials: "${classText}"`);
        const match = classText.match(/Class: (\d+)/i);
        const studentClass = match ? match[1] : '10';
        console.log(`📚 Fetching materials for Class: ${studentClass}`);
        loadMaterials(studentClass);
      }
    });
  });
}

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
        return null;
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
    return data;
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showErrorMessage('Unable to load dashboard data: ' + error.message);
    return null;
  }
}

async function loadMaterials(classLevel) {
    const container = document.getElementById('materials-container');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading materials...</div>';
        const res = await materialsAPI.getByClass(classLevel);
        const list = res.data;

        container.innerHTML = list.length ? list.map(m => `
            <div class="dashboard-card" style="margin-bottom: 15px; border-left: 4px solid #48bb78; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0; color:#2d3748; font-size: 1.1rem;">${m.title}</h4>
                        <p style="margin:5px 0; color:#718096; font-size:0.9rem;">${m.subject} | ${m.description || 'No description'}</p>
                    </div>
                    <button onclick="downloadFile('${m.fileUrl}', '${m.title}.pdf')" class="btn-sm" style="background:#48bb78; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `).join('') : '<p class="empty-state">No study materials available for your class.</p>';
    } catch (err) {
        console.error('Error loading materials:', err);
        container.innerHTML = '<p class="error" style="color:#e53e3e;">Failed to load materials.</p>';
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
    <div class="homework-item" style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div class="subject-icon" style="font-size: 1.5rem;">${getSubjectIcon(hw.subject)}</div>
      <div class="details" style="flex: 1;">
        <p class="subject-title" style="margin:0; font-weight: 600; color: #2d3748;">${hw.subject || 'Homework'} - ${hw.title || 'Assignment'}</p>
        <p class="due-date" style="margin: 4px 0; font-size: 0.85rem; color: #718096;"><i class="fas fa-pencil-alt"></i> Due: ${formatDate(hw.dueDate)}</p>
        ${hw.attachmentUrl ? `
          <button onclick="downloadFile('${hw.attachmentUrl}', '${hw.title || 'homework'}.pdf')" class="download-btn" style="display:inline-block; margin-top:8px; padding:4px 10px; background:#667eea; color:white; border-radius:4px; font-size:0.8rem; text-decoration:none; border:none; cursor:pointer;">
            <i class="fas fa-download"></i> Download Attachment
          </button>
        ` : ''}
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

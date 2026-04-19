/**
 * student-dashboard.js - Wire up the student dashboard with API calls
 * Fetches data on page load and populates DOM elements
 */

import { studentAPI, downloadFile, materialsAPI, waitForBackend } from '../../core/api.js';
import { requireRole, getUserId, syncToSessionStorage, logout as authLogout } from '../../core/auth-manager.js';
import { escapeAttr, escapeHtml, safeFileName } from '../../core/sanitize.js';
import './student-results.js';

// ===========================
// Global Logout Handler
// ===========================
window.handleLogout = function() {
  // Logging out
  authLogout();
};

// ===========================
// Route Protection
// ===========================
if (!requireRole('student')) {
  throw new Error('Unauthorized: Student role required');
}

// ===========================
// Remove Protection Screen
// ===========================
function hideProtectionScreen() {
  const screen = document.getElementById('auth-protection-screen');
  if (screen) {
    screen.style.display = 'none';
  }
}

// ===========================
// Initialization on Page Load
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  // Dashboard initializing
  hideProtectionScreen();

  try {
    // Check backend health before loading dashboard
    // Checking backend connection
    const isBackendReady = await waitForBackend(3, 1000);
    
    if (!isBackendReady) {
      console.error('❌ Backend server is not responding');
      const errorDiv = document.querySelector('.dashboard-card');
      if (errorDiv) {
        errorDiv.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: #cf222e;">
            <h2>⚠️ Connection Error</h2>
            <p>Backend server is not responding. Please ensure:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Backend server is running on port 3000</li>
              <li>PostgreSQL database is connected</li>
              <li>Run: <code>node backend/src/server.js</code></li>
            </ul>
          </div>
        `;
      }
      return;
    }

    // Get userId from centralized auth manager
    syncToSessionStorage('student'); // Ensure sessionStorage is in sync
    let userId = getUserId();

    if (!userId) {
      console.error('❌ No user ID found in auth state');
      window.location.href = '/';
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
    if (dashboardData && dashboardData.profile) {
        const profile = dashboardData.profile;
        // Student Profile loaded
        
        // Populate profile dropdown with initial values
        const nameEls = document.querySelectorAll('#dropdown-student-name');
        nameEls.forEach(el => el.textContent = profile.name || 'Student');
        
        const classEl = document.getElementById('dropdown-student-class');
        if (classEl) classEl.textContent = `Class: ${profile.classLevel || '--'}`;
        
        const sectionEl = document.getElementById('dropdown-student-section');
        if (sectionEl) sectionEl.textContent = profile.section || 'N/A';
        
        const idEl = document.getElementById('dropdown-student-id');
        if (idEl) idEl.textContent = profile.rollNumber || profile.id || 'N/A';
        
        const initialEl = document.getElementById('student-avatar-initial');
        const nameParts = (profile.name || 'S').trim().split(' ');
        if (initialEl && nameParts.length > 0 && nameParts[0]) {
            initialEl.textContent = nameParts[0].charAt(0).toUpperCase();
        }
        
        // Ensure section exists or is pass as 'ALL' or empty to the API
        await loadMaterials(profile.classLevel, profile.section || '');
    }

    // Tab Switching Logic
    setupTabSwitching();
    
    // Setup Profile Menu
    setupProfileMenu();
  } catch (error) {
    console.error('❌ Dashboard initialization failed:', error);
    showErrorMessage('Failed to load dashboard. Please refresh the page.');
  }
});

function setupProfileMenu() {
  const profileBtn = document.getElementById('student-profile-btn');
  const profileDropdown = document.getElementById('student-profile-dropdown');
  const logoutBtn = document.getElementById('dropdown-logout-btn');

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
      profileBtn.setAttribute('aria-expanded', !isExpanded);
      profileDropdown.classList.toggle('open');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.handleLogout();
      window.location.href = '/';
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const profileMenu = document.getElementById('student-profile-menu');
    if (profileMenu && !profileMenu.contains(e.target)) {
      if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
      if (profileDropdown) profileDropdown.classList.remove('open');
    }

    // Close mobile sidebar if clicking outside of it
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
      if (!sidebar.contains(e.target) && (!mobileToggle || !mobileToggle.contains(e.target))) {
        sidebar.classList.remove('active');
      }
    }
  });
}

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
          // Tab switched
      }

      if (tabId === 'materials') {
        const classText = document.getElementById('student-class')?.innerText || '';
        const classMatch = classText.match(/Class: (\d+)/i);
        const sectionMatch = classText.match(/Section: ([A-B])/i);
        
        const studentClass = classMatch ? classMatch[1] : '';
        const studentSection = sectionMatch ? sectionMatch[1] : '';
        
        loadMaterials(studentClass, studentSection);
      }

      if (tabId === 'syllabus') {
          const userId = sessionStorage.getItem('studentUserId');
          if (userId) loadSyllabus(userId);
      }
    });
  });
}

/**
 * Main function to fetch and populate all dashboard data
 */
async function loadDashboardData(userId) {
  try {
    // Fetching dashboard data

    // Fetch data from backend
    const dashboardResponse = await studentAPI.getDashboard(userId);

    if (!dashboardResponse || !dashboardResponse.success) {
      if (dashboardResponse?.error === 'Student record not found') {
        showErrorMessage('Your student profile is being set up. Please try again in a moment.');
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return null;
      }
      throw new Error(dashboardResponse?.error || 'Failed to fetch dashboard data');
    }

    const { data } = dashboardResponse;
    if (!data) throw new Error('No data received from server');

    if (data.profile) populateProfile(data.profile);
    if (data.attendance) populateAttendance(data.attendance);
    if (data.fees) populateFees(data.fees);
    if (data.homework) {
        populateHomework(data.homework);
        populateLatestHomeworkCard(data.homework);
    }
    if (data.dailyPractice) {
        populateDailyPractice(data.dailyPractice);
        populateLatestDPPCard(data.dailyPractice);
    }
    if (data.courseProgress) populateCourseProgress(data.courseProgress);
    if (data.timetable) populateTimetable(data.timetable);
    if (data.notifications) populateNotifications(data.notifications);

    // Dashboard loaded successfully
    return data;
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showErrorMessage('Unable to load dashboard data: ' + error.message);
    return null;
  }
}

async function loadMaterials(classLevel, section = '') {
    const container = document.getElementById('materials-container');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading materials...</div>';
        
        const normalizedClassLevel = String(classLevel).trim();
        const normalizedSection = String(section).trim();
        
        console.log('📚 [Student Materials] Loading: classLevel=', normalizedClassLevel, 'section=', normalizedSection || 'ALL');
        
        const res = await materialsAPI.getByClass(normalizedClassLevel, normalizedSection);
        
        console.log('📚 [Student Materials] Response:', res);
        
        // Check for API errors
        if (res.error) {
            console.error('❌ [Student Materials] API Error:', res.error);
            container.innerHTML = `<p class="error" style="color:#e53e3e;">Failed to load materials: ${res.error}</p>`;
            return;
        }
        
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        console.log(`📚 [Student Materials] Loaded ${list.length} materials`);

        if (list.length === 0) {
            container.innerHTML = '<p class="empty-state">No study materials available for your class.</p>';
            return;
        }

        container.innerHTML = list.map(m => `
            <div class="dashboard-card" style="margin-bottom: 15px; border-left: 4px solid #48bb78; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex: 1;">
                        <h4 style="margin:0; color:#2d3748; font-size: 1.1rem;">${escapeHtml(m.title)}</h4>
                        <p style="margin:8px 0 0 0; color:#718096; font-size:0.9rem;">
                            <span style="font-weight: 500;">${escapeHtml(m.subject)}</span>
                            ${m.section ? ` • ${m.section}` : ''}
                        </p>
                        ${m.description ? `<p style="margin:5px 0 0 0; color:#718096; font-size:0.85rem;">${escapeHtml(m.description)}</p>` : ''}
                    </div>
                    <button onclick="downloadFile('${escapeAttr(m.fileUrl)}', '${escapeAttr(safeFileName(m.title, 'material') + '.pdf')}')" class="btn-sm" style="background:#48bb78; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:8px; white-space: nowrap; margin-left: 15px;">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('❌ Error loading materials:', err);
        container.innerHTML = `<p class="error" style="color:#e53e3e;">Failed to load materials: ${err.message || 'Unknown error'}</p>`;
    }
}

async function loadSyllabus(userId) {
    const container = document.getElementById('syllabus-container');
    if (!container) return;

    try {
        container.innerHTML = '<p class="loading-text">Loading syllabus...</p>';
        const response = await studentAPI.getSyllabus(userId);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to fetch syllabus');
        }

        const items = response.syllabus || [];
        
        if (items.length === 0) {
            container.innerHTML = '<p class="empty-state">No syllabus assigned yet.</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="dashboard-card" style="margin-bottom: 15px; border-left: 4px solid #667eea; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h4 style="margin:0; color:#2d3748; font-size: 1.1rem;">${escapeHtml(item.subject)} - Chapter ${escapeHtml(item.chapter)}</h4>
                        <p style="margin:5px 0; color:#718096; font-size:0.9rem;">
                           ${escapeHtml(item.description || 'No description provided.')}
                        </p>
                        <small style="color:#a0aec0; display:block; margin-top:8px;">
                            ${item.teacherPhone ? 'Teacher Contact: ' + escapeHtml(item.teacherPhone) : 'Teacher: Unknown'}
                        </small>
                    </div>
                    <div>
                        ${item.completed 
                           ? '<span class="badge" style="background:#c6f6d5; color:#22543d; padding:4px 8px; border-radius:12px; font-size:0.8rem;">Completed</span>' 
                           : '<span class="badge" style="background:#fefcbf; color:#744210; padding:4px 8px; border-radius:12px; font-size:0.8rem;">Pending</span>'}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading syllabus:', err);
        container.innerHTML = '<p class="error" style="color:#e53e3e;">Failed to load syllabus. Please try again.</p>';
    }
}

function populateProfile(profile) {
  const nameElement = document.getElementById('student-name');
  const classElement = document.getElementById('student-class');
  if (nameElement && profile.name) nameElement.textContent = profile.name;
  if (classElement && profile.classLevel) {
    classElement.textContent = `Class: ${profile.classLevel} | ${profile.section || 'N/A'}`;
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
  const feesSummary = document.getElementById('fees-summary');
  const feesCard = document.getElementById('student-fees-card');

  if (fees.totalPending !== undefined) {
    // Update summary if present
    if (feesSummary) {
      document.getElementById('fees-total-paid').textContent = (fees.totalPaid || 0).toFixed(2);
      document.getElementById('fees-total-pending').textContent = (fees.totalPending || 0).toFixed(2);
      feesSummary.style.display = 'block';
    }

    // Update display text
    if (feesDisplay) {
      feesDisplay.textContent = `Pending: ₹${(fees.totalPending || 0).toLocaleString()}`;
    }
  }

  // Show fee history if available
  if (fees.fees && Array.isArray(fees.fees)) {
    displayStudentFeeHistory(fees.fees);
    if (feesCard) feesCard.style.display = 'block';
  }
}

/**
 * Display student fee history with badges
 */
function displayStudentFeeHistory(fees) {
  const tbody = document.getElementById('student-fee-history-table');
  if (!tbody) return;

  if (!fees.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem; color:var(--text-muted);">No fees found</td></tr>';
    return;
  }

  tbody.innerHTML = fees.map(f => {
    const statusBadge = f.paid 
      ? `<span style="color:var(--success); font-weight:600;">✓ Paid</span>` 
      : `<span style="color:var(--danger); font-weight:600;">⏳ Pending</span>`;

    return `
      <tr style="border-bottom:1px solid var(--border-subtle);">
        <td style="padding:0.5rem; text-align:left;">
          <div style="font-weight:500;">${f.description || 'Fee'}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Due: ${new Date(f.dueDate).toLocaleDateString('en-IN')}</div>
        </td>
        <td style="padding:0.5rem; text-align:right; font-weight:600;">₹${parseFloat(f.amount).toFixed(2)}</td>
        <td style="padding:0.5rem; text-align:left;">${statusBadge}</td>
      </tr>
    `;
  }).join('');
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
        <p class="subject-title" style="margin:0; font-weight: 600; color: #2d3748;">${escapeHtml(hw.subject || 'Homework')} - ${escapeHtml(hw.title || 'Assignment')}</p>
        <p class="due-date" style="margin: 4px 0; font-size: 0.85rem; color: #718096;"><i class="fas fa-pencil-alt"></i> Due: ${formatDate(hw.dueDate)}</p>
        ${hw.attachmentUrl ? `
          <button onclick="downloadFile('${escapeAttr(hw.attachmentUrl)}', '${escapeAttr(safeFileName(hw.title || 'homework') + '.pdf')}')" class="download-btn" style="display:inline-block; margin-top:8px; padding:4px 10px; background:#667eea; color:white; border-radius:4px; font-size:0.8rem; text-decoration:none; border:none; cursor:pointer;">
            <i class="fas fa-download"></i> Download Attachment
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function populateDailyPractice(practiceList) {
  const container = document.getElementById('daily-practice-container');
  if (!container) return;
  if (!Array.isArray(practiceList) || practiceList.length === 0) {
    container.innerHTML = '<p class="no-data">No daily practice assigned for today</p>';
    return;
  }
  container.innerHTML = practiceList.map((hw, idx) => `
    <div class="homework-item" style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div class="subject-icon" style="font-size: 1.5rem;">${getSubjectIcon(hw.subject)}</div>
      <div class="details" style="flex: 1;">
        <p class="subject-title" style="margin:0; font-weight: 600; color: #2d3748;">${escapeHtml(hw.subject || 'Practice')} - ${escapeHtml(hw.title || 'Assignment')}</p>
        <p class="due-date" style="margin: 4px 0; font-size: 0.85rem; color: #718096;"><i class="fas fa-pencil-alt"></i> Posted: ${new Date(hw.createdAt).toLocaleDateString()}</p>
        ${hw.attachmentUrl ? `
          <button onclick="downloadFile('${escapeAttr(hw.attachmentUrl)}', '${escapeAttr(safeFileName(hw.title || 'practice') + '.pdf')}')" class="download-btn" style="display:inline-block; margin-top:8px; padding:4px 10px; background:#48bb78; color:white; border-radius:4px; font-size:0.8rem; text-decoration:none; border:none; cursor:pointer;">
            <i class="fas fa-download"></i> Download Attachment
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function populateLatestHomeworkCard(homework) {
  const card = document.getElementById('latest-homework-card');
  const titleEl = document.getElementById('latest-homework-title');
  const descEl = document.getElementById('latest-homework-desc');
  const dueEl = document.getElementById('latest-homework-due');

  if (!Array.isArray(homework) || homework.length === 0) {
    if (titleEl) titleEl.textContent = 'No Assignment';
    if (descEl) descEl.textContent = 'No homework assigned';
    if (dueEl) dueEl.textContent = 'Due: --';
    return;
  }

  // Get the latest homework
  const latest = homework[0];
  if (titleEl) titleEl.textContent = latest.subject ? `${latest.subject}${latest.title ? ' - ' + latest.title : ''}` : (latest.title || 'Assignment');
  if (descEl) descEl.textContent = latest.title ? latest.title.substring(0, 50) + (latest.title.length > 50 ? '...' : '') : 'New assignment';
  if (dueEl) dueEl.textContent = `Due: ${formatDate(latest.dueDate)}`;

  // Add click handler to scroll to homework section on home tab
  if (card) {
    card.addEventListener('click', () => {
      navigateToTab('dpp');
    });
  }
}

function populateLatestDPPCard(practiceList) {
  const card = document.getElementById('latest-dpp-card');
  const titleEl = document.getElementById('latest-dpp-title');
  const descEl = document.getElementById('latest-dpp-desc');
  const dateEl = document.getElementById('latest-dpp-date');

  if (!Array.isArray(practiceList) || practiceList.length === 0) {
    if (titleEl) titleEl.textContent = 'No Practice';
    if (descEl) descEl.textContent = 'No daily practice assigned';
    if (dateEl) dateEl.textContent = 'Posted: --';
    return;
  }

  // Get the latest practice
  const latest = practiceList[0];
  if (titleEl) titleEl.textContent = latest.subject ? `${latest.subject}${latest.title ? ' - ' + latest.title : ''}` : (latest.title || 'Practice Problem');
  if (descEl) descEl.textContent = latest.title ? latest.title.substring(0, 50) + (latest.title.length > 50 ? '...' : '') : 'New problems';
  if (dateEl) dateEl.textContent = `Posted: ${formatDate(latest.createdAt)}`;

  // Add click handler to navigate to DPP tab
  if (card) {
    card.addEventListener('click', () => {
      navigateToTab('dpp');
    });
  }
}

function navigateToTab(tabId) {
  const link = document.querySelector(`[data-tab="${tabId}"]`);
  if (link) {
    link.click();
  }
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

// ===========================
// Timetable
// ===========================
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h), parseInt(m));
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) { return timeStr; }
}

// ===========================
// TIMETABLE HELPER FUNCTIONS
// ===========================
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  try {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  } catch (e) { return null; }
}

function getCurrentTimeInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isDayToday(dayOfWeek) {
  if (!dayOfWeek) return false;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  return dayOfWeek.toLowerCase() === today.toLowerCase();
}

function getClassStatus(entry) {
  const startMinutes = parseTimeToMinutes(entry.startTime);
  const endMinutes = parseTimeToMinutes(entry.endTime);
  const currentMinutes = getCurrentTimeInMinutes();
  const isToday = isDayToday(entry.dayOfWeek);

  if (!startMinutes || !endMinutes) return 'upcoming';

  if (isToday) {
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return 'ongoing';
    } else if (currentMinutes >= endMinutes) {
      return 'completed';
    }
  } else {
    // For non-today days, check if day is in past or future
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay();
    const dayIndex = days.findIndex(d => d.toLowerCase() === (entry.dayOfWeek || '').toLowerCase());
    
    if (dayIndex < todayIndex) {
      return 'completed';
    }
  }

  return 'upcoming';
}

function getStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅';
    case 'ongoing': return '🟢';
    case 'upcoming': return '⏳';
    default: return '•';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'ongoing': return 'Ongoing';
    case 'upcoming': return 'Upcoming';
    default: return 'Unknown';
  }
}

function updateCurrentTime() {
  const timeEl = document.getElementById('current-time');
  const previewTimeEl = document.getElementById('current-time-preview');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  
  if (timeEl) {
    timeEl.textContent = `Current Time: ${timeStr}`;
  }
  
  if (previewTimeEl) {
    const previewTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    previewTimeEl.textContent = previewTimeStr;
  }
}

function populateTimetable(timetable) {
  const container = document.getElementById('timetable-container');
  if (!container) return;

  if (!Array.isArray(timetable) || timetable.length === 0) {
    container.innerHTML = `
      <div class="timetable-empty">
        <i class="fas fa-calendar-times"></i>
        <p>No timetable available for your class</p>
      </div>
    `;
    return;
  }

  // Sort timetable by day and time
  const sortedTimetable = [...timetable].sort((a, b) => {
    const dayOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };
    const dayCompare = (dayOrder[a.dayOfWeek] || 0) - (dayOrder[b.dayOfWeek] || 0);
    if (dayCompare !== 0) return dayCompare;
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });

  // Generate table HTML
  const tableHTML = `
    <table class="timetable-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Time</th>
          <th>Subject</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${sortedTimetable.map(entry => {
          const status = getClassStatus(entry);
          const isOngoing = status === 'ongoing';
          const statusIcon = getStatusIcon(status);
          const statusLabel = getStatusLabel(status);
          
          return `
            <tr class="${isOngoing ? 'ongoing-row' : ''}">
              <td class="day-col">${entry.dayOfWeek || '—'}</td>
              <td class="time-col">${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}</td>
              <td class="subject-col">${entry.subject || 'N/A'}</td>
              <td class="status-col">
                <span class="status-badge status-${status}">
                  ${statusIcon} ${statusLabel}
                </span>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;

  // Update current time (both full and preview)
  updateCurrentTime();
  
  // Update time every second (single interval for both)
  setInterval(updateCurrentTime, 1000);

  // Also populate preview with today's classes
  populateTimetablePreview(timetable);
}

function populateTimetablePreview(timetable) {
  const preview = document.getElementById('timetable-preview');
  if (!preview) return;

  if (!Array.isArray(timetable) || timetable.length === 0) {
    preview.innerHTML = `
      <div class="timetable-empty">
        <i class="fas fa-calendar-times"></i>
        <p>No classes scheduled for today</p>
      </div>
    `;
    return;
  }

  // Filter only today's classes and sort by time
  const todayClasses = timetable.filter(entry => isDayToday(entry.dayOfWeek))
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  if (todayClasses.length === 0) {
    preview.innerHTML = `
      <div class="timetable-empty">
        <i class="fas fa-check-circle"></i>
        <p>No classes scheduled for today</p>
      </div>
    `;
    return;
  }

  // Find ongoing and next upcoming class
  let ongoingClass = null;
  let upcomingClass = null;

  for (const cls of todayClasses) {
    const status = getClassStatus(cls);
    if (status === 'ongoing' && !ongoingClass) {
      ongoingClass = cls;
    } else if (status === 'upcoming' && !upcomingClass) {
      upcomingClass = cls;
    }
  }

  // If no ongoing, use first upcoming as ongoing display
  if (!ongoingClass && upcomingClass) {
    ongoingClass = upcomingClass;
    upcomingClass = todayClasses.find(
      cls => getClassStatus(cls) === 'upcoming' && cls !== ongoingClass
    );
  }

  // Generate minimal two-section layout
  let html = '<div class="timetable-preview-container">';

  // Ongoing/Current Class Section
  if (ongoingClass) {
    const status = getClassStatus(ongoingClass);
    const statusLabel = getStatusLabel(status);
    html += `
      <div class="class-card class-card-ongoing">
        <div class="class-card-label">
          <i class="fas fa-dot-circle"></i>
          <span>${status === 'ongoing' ? 'Ongoing' : 'Current'}</span>
        </div>
        <div class="class-card-content">
          <div class="class-time">${formatTime(ongoingClass.startTime)} – ${formatTime(ongoingClass.endTime)}</div>
          <div class="class-subject">${ongoingClass.subject || 'N/A'}</div>
        </div>
      </div>
    `;
  }

  // Upcoming Class Section
  if (upcomingClass) {
    html += `
      <div class="class-card class-card-upcoming">
        <div class="class-card-label">
          <i class="fas fa-clock"></i>
          <span>Upcoming</span>
        </div>
        <div class="class-card-content">
          <div class="class-time">${formatTime(upcomingClass.startTime)} – ${formatTime(upcomingClass.endTime)}</div>
          <div class="class-subject">${upcomingClass.subject || 'N/A'}</div>
        </div>
      </div>
    `;
  }

  html += '</div>';
  preview.innerHTML = html;
}

function updateCurrentTimePreview() {
  const timeEl = document.getElementById('current-time-preview');
  if (timeEl) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    timeEl.textContent = timeStr;
  }
}

// ===========================
// Notifications
// ===========================

function populateNotifications(notifications) {
  const fullEl = document.getElementById('notifications-container');
  const previewEl = document.getElementById('notifications-preview');
  const dot = document.getElementById('notif-dot');

  if (dot && notifications.length > 0) dot.style.display = 'block';

  if (!Array.isArray(notifications) || notifications.length === 0) {
    const empty = '<p class="empty-state">No announcements at this time.</p>';
    if (fullEl) fullEl.innerHTML = empty;
    if (previewEl) previewEl.innerHTML = empty;
    return;
  }

  const fullHtml = notifications.map(n => {
    const message = n.message || 'No message content';
    return `
    <div class="notification-card">
      <div class="notification-header">
        <span class="notification-title">${escapeHtml(n.title || 'Announcement')}</span>
        <span class="notification-date">${formatDate(n.createdAt)}</span>
      </div>
      <p class="notification-message">${escapeHtml(message)}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        ${n.classLevel ? `<span class="notification-badge">Class ${escapeHtml(n.classLevel)}</span>` : '<span class="notification-badge global">All Classes</span>'}
        ${n.attachmentUrl ? `<button onclick="downloadFile('${escapeAttr(n.attachmentUrl)}', '${escapeAttr(safeFileName(n.title || 'notification') + '.pdf')}')" class="download-link" style="color:var(--accent-blue); font-size:0.85rem; background:none; border:none; cursor:pointer;"><i class="fas fa-file-download"></i> Attachment</button>` : ''}
      </div>
    </div>
  `;}).join('');

  if (fullEl) fullEl.innerHTML = fullHtml;

  // Preview: show first 3
  if (previewEl) {
    previewEl.innerHTML = notifications.slice(0, 3).map(n => {
      const msg = n.message || '';
      return `
      <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle);">
        <p style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 2px;">${escapeHtml(n.title || 'Announcement')}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${msg.substring(0, 80)}${msg.length > 80 ? '…' : ''}</p>
      </div>
    `;}).join('');
    if (notifications.length > 3) {
      previewEl.innerHTML += `<p style="font-size:0.8rem; color: var(--accent-blue);">View All →</p>`;
    }
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

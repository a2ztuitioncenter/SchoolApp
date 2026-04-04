/**
 * student-dashboard.js - Wire up the student dashboard with API calls
 * Fetches data on page load and populates DOM elements
 */

import { studentAPI, downloadFile, materialsAPI, waitForBackend } from '../../core/api.js';

// ===========================
// Initialization on Page Load
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 Dashboard initializing...');

  try {
    // Check backend health before loading dashboard
    console.log('⏳ Checking backend connection...');
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
    if (data.dailyPractice) populateDailyPractice(data.dailyPractice);
    if (data.courseProgress) populateCourseProgress(data.courseProgress);
    if (data.timetable) populateTimetable(data.timetable);
    if (data.notifications) populateNotifications(data.notifications);

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
                        <h4 style="margin:0; color:#2d3748; font-size: 1.1rem;">${item.subject} - Chapter ${item.chapter}</h4>
                        <p style="margin:5px 0; color:#718096; font-size:0.9rem;">
                           ${item.description || 'No description provided.'}
                        </p>
                        <small style="color:#a0aec0; display:block; margin-top:8px;">
                            ${item.teacherPhone ? 'Teacher Contact: ' + item.teacherPhone : 'Teacher: Unknown'}
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
        <p class="subject-title" style="margin:0; font-weight: 600; color: #2d3748;">${hw.subject || 'Practice'} - ${hw.title || 'Assignment'}</p>
        <p class="due-date" style="margin: 4px 0; font-size: 0.85rem; color: #718096;"><i class="fas fa-pencil-alt"></i> Posted: ${new Date(hw.createdAt).toLocaleDateString()}</p>
        ${hw.attachmentUrl ? `
          <button onclick="downloadFile('${hw.attachmentUrl}', '${hw.title || 'practice'}.pdf')" class="download-btn" style="display:inline-block; margin-top:8px; padding:4px 10px; background:#48bb78; color:white; border-radius:4px; font-size:0.8rem; text-decoration:none; border:none; cursor:pointer;">
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

function populateTimetable(timetable) {
  const containers = ['timetable-container', 'timetable-preview'].map(id => document.getElementById(id)).filter(Boolean);
  if (!containers.length) return;

  if (!Array.isArray(timetable) || timetable.length === 0) {
    containers.forEach(c => { c.innerHTML = '<p class="empty-state">No timetable available for your class.</p>'; });
    return;
  }

  // Group by day
  const byDay = {};
  timetable.forEach(entry => {
    const day = entry.dayOfWeek || 'Other';
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(entry);
  });

  const html = DAY_ORDER.filter(d => byDay[d])
    .map(day => `
      <div class="timetable-day">
        <div class="timetable-day-label">${day}</div>
        <div class="timetable-entries">
          ${byDay[day].map(e => `
            <div class="timetable-row">
              <span class="timetable-time">${formatTime(e.startTime)} – ${formatTime(e.endTime)}</span>
              <span class="timetable-subject">${e.subject}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

  // Full timetable container — show all days
  const full = document.getElementById('timetable-container');
  if (full) full.innerHTML = html;

  // Preview — show max 5 entries from the week
  const preview = document.getElementById('timetable-preview');
  if (preview) {
    const previewEntries = timetable.slice(0, 5);
    preview.innerHTML = previewEntries.map(e =>
      `<p class="timetable-preview-item"><strong>${e.dayOfWeek}:</strong> ${formatTime(e.startTime)} – ${e.subject}</p>`
    ).join('');
    if (timetable.length > 5) {
      preview.innerHTML += `<p style="font-size:0.8rem; color: var(--text-muted); margin-top: 4px;">+${timetable.length - 5} more…</p>`;
    }
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

  const fullHtml = notifications.map(n => `
    <div class="notification-card">
      <div class="notification-header">
        <span class="notification-title">${n.title}</span>
        <span class="notification-date">${formatDate(n.createdAt)}</span>
      </div>
      <p class="notification-message">${n.message}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        ${n.classLevel ? `<span class="notification-badge">Class ${n.classLevel}</span>` : '<span class="notification-badge global">All Classes</span>'}
        ${n.attachmentUrl ? `<a href="${n.attachmentUrl}" target="_blank" class="download-link" style="color:var(--accent-blue); font-size:0.85rem;"><i class="fas fa-file-download"></i> Attachment</a>` : ''}
      </div>
    </div>
  `).join('');

  if (fullEl) fullEl.innerHTML = fullHtml;

  // Preview: show first 3
  if (previewEl) {
    previewEl.innerHTML = notifications.slice(0, 3).map(n => `
      <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle);">
        <p style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 2px;">${n.title}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${n.message.substring(0, 80)}${n.message.length > 80 ? '…' : ''}</p>
      </div>
    `).join('');
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

export function logout() {
  sessionStorage.removeItem('studentUserId');
  sessionStorage.removeItem('authToken');
  window.location.href = '/';
}

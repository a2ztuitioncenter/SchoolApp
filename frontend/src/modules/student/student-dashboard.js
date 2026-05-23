/**
 * student-dashboard.js - Wire up the student dashboard with API calls
 * Fetches data on page load and populates DOM elements
 */

import { studentAPI, downloadFile, materialsAPI, waitForBackend, profileAPI, contentAPI, submissionsAPI, assignmentsAPI, uploadFileWithProgress, doubtsAPI } from '../../core/api.js';
import { requireRole, getUserId, syncToSessionStorage, logout as authLogout } from '../../core/auth-manager.js';
import { escapeAttr, escapeHtml, safeFileName } from '../../core/sanitize.js';
import { getCache, setCache, clearCache, CACHE_TTL } from '../../core/cache.js';
import './student-results.js';

// ===========================
// Request Control
// ===========================
let dashboardAbortController = null;
window.studentSubmissionsMap = new Map();
window.currentAssignments = []; // Global storage for detail lookup

// Pending uploads for student dashboard
let pendingSubmissionUpload = null;
let pendingProfileUpload = null;

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
      console.error('[DASHBOARD] Backend server is not responding');
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
      console.error('[DASHBOARD] No user ID found in auth state');
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
    console.error('[DASHBOARD] Initialization failed:', error);
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
      document.querySelectorAll('.tab-content, .content').forEach(el => {
          el.classList.add('hidden-tab');
          el.classList.remove('active-tab');
      });
      const target = document.getElementById(`tab-${tabId}`) || document.getElementById(tabId);
      if (target) {
          target.classList.remove('hidden-tab');
          target.classList.add('active-tab');
          // Tab switched
      }

      if (tabId === 'materials') {
        const classEl = document.getElementById('dropdown-student-class');
        const sectionEl = document.getElementById('dropdown-student-section');
        const classText = classEl ? classEl.textContent : '';
        const sectionText = sectionEl ? sectionEl.textContent : '';
        
        const classMatch = classText.match(/Class: (\d+)/i);
        const studentClass = classMatch ? classMatch[1] : '';
        const studentSection = sectionText !== 'N/A' ? sectionText : '';
        
        loadMaterials(studentClass, studentSection);
      }

      if (tabId === 'syllabus') {
          const userId = sessionStorage.getItem('studentUserId');
          if (userId) loadSyllabus(userId);
      }

      if (tabId === 'subjects') {
        const classEl = document.getElementById('dropdown-student-class');
        const sectionEl = document.getElementById('dropdown-student-section');
        const classText = classEl ? classEl.textContent : '';
        const sectionText = sectionEl ? sectionEl.textContent : '';
        
        const classMatch = classText.match(/Class: (\d+)/i);
        const studentClass = classMatch ? classMatch[1] : '';
        const studentSection = sectionText !== 'N/A' ? sectionText : '';
        
        loadSubjects(studentClass, studentSection);
      }

      if (tabId === 'submissions') {
        const userId = sessionStorage.getItem('studentUserId');
        if (userId) loadSubmissions(userId);
      }

      if (tabId === 'doubts') {
        loadStudentDoubtsTab();
      }
    });
  });
}

/**
 * Populate all dashboard UI components with provided data
 */
function populateDashboard(data) {
    if (data.profile) populateProfile(data.profile);
    if (data.attendance) populateAttendance(data.attendance);
    if (data.fees) populateFees(data.fees);
    if (data.homework) {
        window.currentAssignments = [...window.currentAssignments, ...data.homework];
        populateHomework(data.homework);
        populateLatestHomeworkCard(data.homework);
    }
    if (data.dailyPractice) {
        window.currentAssignments = [...window.currentAssignments, ...data.dailyPractice];
        populateDailyPractice(data.dailyPractice);
        populateLatestDPPCard(data.dailyPractice);
    }
    if (data.courseProgress) populateCourseProgress(data.courseProgress);
    if (data.timetable) populateTimetable(data.timetable);
    if (data.notifications) populateNotifications(data.notifications);
}

/**
 * Fetches student submissions and populates global map
 */
async function fetchSubmissionsMap(userId) {
  try {
    const res = await studentAPI.getSubmissions(userId || 'me');
    if (res.success && res.data) {
      window.studentSubmissionsMap.clear();
      res.data.forEach(sub => {
        window.studentSubmissionsMap.set(sub.homework_id, sub);
      });
      console.log('[SUBMISSIONS] Map populated:', window.studentSubmissionsMap);
    }
  } catch (err) {
    console.warn('[SUBMISSIONS] Could not fetch submissions map:', err);
  }
}

/**
 * Main function to fetch and populate all dashboard data
 */
async function loadDashboardData(userId) {
  // Cancel previous dashboard fetch if it exists
  if (dashboardAbortController) {
    dashboardAbortController.abort();
  }
  dashboardAbortController = new AbortController();

  try {
    // 1. Check Cache (Stale-While-Revalidate)
    const cached = getCache(userId, 'dashboard');
    if (cached) {
      console.log('[DASHBOARD] Using cached dashboard data');
      
      // Fetch submissions map
      await fetchSubmissionsMap(userId);
      
      populateDashboard(cached.data);
      
      // If cache is fresh (not stale), we can stop here
      if (!cached.isStale) {
        return cached.data;
      }
      // If stale, continue to fetch in background
    }

    // 2. Fetch Fresh Data
    const dashboardResponse = await studentAPI.getDashboard(userId, { 
      signal: dashboardAbortController.signal 
    });

    // Reset current assignments on fresh load
    window.currentAssignments = [];

    if (!dashboardResponse || !dashboardResponse.success) {
      const errTxt = dashboardResponse?.error || dashboardResponse?.message || '';
      if (errTxt === 'Student record not found' || errTxt === 'Student not found') {
        showErrorMessage('Your student profile is being set up. Please try again in a moment.');
        setTimeout(() => { window.location.href = '/'; }, 3000);
        return null;
      }
      
      // If we have cached data, don't show error, just use what we have
      if (cached) return cached.data;
      
      throw new Error(errTxt || 'Failed to fetch dashboard data');
    }

    const { data } = dashboardResponse;
    if (!data) throw new Error('No data received from server');

    // 3. Update Cache & UI
    setCache(userId, 'dashboard', data, CACHE_TTL.DASHBOARD);
    
    // Fetch global submissions map
    await fetchSubmissionsMap(userId);

    populateDashboard(data);

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[DASHBOARD] Fetch aborted');
      return null;
    }
    console.error('[DASHBOARD] Error loading dashboard:', error);
    
    // Fallback to cache if error occurs
    const cached = getCache(userId, 'dashboard');
    if (cached) return cached.data;
    
    showErrorMessage('Unable to load dashboard data: ' + error.message);
    return null;
  }
}

let isMaterialsLoading = false;
async function loadMaterials(classLevel, section = '') {
    if (isMaterialsLoading) return;
    isMaterialsLoading = true;
    const container = document.getElementById('materials-container');
    if (!container) {
        isMaterialsLoading = false;
        return;
    }
    
    try {
        container.innerHTML = '<div class="loading">Loading materials...</div>';
        
        const normalizedClassLevel = String(classLevel).trim();
        const normalizedSection = String(section).trim();
        
        console.log('[MATERIALS] Loading: classLevel=', normalizedClassLevel, 'section=', normalizedSection || 'ALL');
        
        const res = await materialsAPI.getByClass(normalizedClassLevel, normalizedSection);
        
        console.log('[MATERIALS] Response:', res);
        
        // Check for API errors
        if (res.error) {
            console.error('[MATERIALS] API Error:', res.error);
            container.innerHTML = `<p class="error" style="color:#e53e3e;">Failed to load materials: ${res.error}</p>`;
            return;
        }
        
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        console.log(`[MATERIALS] Loaded ${list.length} materials`);

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
        console.error('[MATERIALS] Error loading materials:', err);
        container.innerHTML = `<p class="error" style="color:#e53e3e;">Failed to load materials: ${err.message || 'Unknown error'}</p>`;
    } finally {
        isMaterialsLoading = false;
    }
}

let isSyllabusLoading = false;
async function loadSyllabus(userId) {
    if (isSyllabusLoading) return;
    isSyllabusLoading = true;
    const container = document.getElementById('syllabus-container');
    if (!container) {
        isSyllabusLoading = false;
        return;
    }

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
    } finally {
        isSyllabusLoading = false;
    }
}

let isSubjectsLoading = false;
async function loadSubjects(classLevel, section = '') {
    if (isSubjectsLoading) return;
    isSubjectsLoading = true;
    const container = document.getElementById('subjects-container');
    if (!container) {
        isSubjectsLoading = false;
        return;
    }
    
    try {
        container.innerHTML = '<div class="loading">Loading subjects...</div>';
        
        const normalizedClassLevel = String(classLevel).trim();
        const normalizedSection = String(section).trim();
        
        console.log('[SUBJECTS] Loading: classLevel=', normalizedClassLevel, 'section=', normalizedSection || 'ALL');
        
        // Import subjectsAPI from core/api.js (it's already imported at the top)
        const { subjectsAPI } = await import('../../core/api.js'); 
        const res = await subjectsAPI.getAll(normalizedClassLevel, normalizedSection);
        
        console.log('[SUBJECTS] Response:', res);
        
        const list = Array.isArray(res) ? res : (res.data || []);
        
        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 2rem; color: #718096;">
                    <i class="fas fa-book-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>No subjects assigned to your class yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                ${list.map(s => `
                    <div class="dashboard-card" style="border-top: 4px solid #667eea; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 48px; height: 48px; background: #ebf4ff; color: #667eea; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                <i class="fas fa-book"></i>
                            </div>
                            <div>
                                <h4 style="margin: 0; color: #2d3748; font-size: 1.1rem;">${escapeHtml(s.name)}</h4>
                                <p style="margin: 4px 0 0 0; color: #718096; font-size: 0.85rem;">
                                    ${s.section && s.section !== 'ALL' ? `Section ${s.section}` : 'All Sections'}
                                </p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error('[SUBJECTS] Error loading subjects:', err);
        container.innerHTML = `<p class="error" style="color: #e53e3e; text-align: center; padding: 1rem;">Failed to load subjects: ${err.message || 'Unknown error'}</p>`;
    } finally {
        isSubjectsLoading = false;
    }
}

function populateProfile(profile) {
  // Update name in all elements with id/class dropdown-student-name
  const nameEls = document.querySelectorAll('#dropdown-student-name');
  nameEls.forEach(el => el.textContent = profile.name || 'Student');
  
  // Also update `#student-name` if it exists
  const nameElement = document.getElementById('student-name');
  if (nameElement && profile.name) nameElement.textContent = profile.name;
  
  // Update class
  const classElement = document.getElementById('dropdown-student-class');
  if (classElement) {
    classElement.textContent = `Class: ${profile.classLevel || '--'}`;
  }
  
  // Update section
  const sectionElement = document.getElementById('dropdown-student-section');
  if (sectionElement) {
    sectionElement.textContent = profile.section || 'N/A';
  }
  
  // Update Roll Number / ID
  const idEl = document.getElementById('dropdown-student-id');
  if (idEl) {
    idEl.textContent = profile.rollNumber || profile.id || 'N/A';
  }
  
  // Update avatar initial
  const initialEl = document.getElementById('student-avatar-initial');
  if (initialEl) {
    const nameParts = (profile.name || 'S').trim().split(' ');
    if (nameParts.length > 0 && nameParts[0]) {
      initialEl.textContent = nameParts[0].charAt(0).toUpperCase();
    }
  }

  // Update Profile Image
  const profileImg = document.querySelector('#student-profile-btn img') || document.querySelector('#student-profile-btn .avatar-circle');
  if (profile.avatar_url) {
    const avatarUrl = profile.avatar_url;
    if (profileImg && profileImg.tagName === 'IMG') {
      profileImg.src = avatarUrl; // Direct property assignment is safe
    } else if (profileImg) {
      // Replace circle with img
      const btn = document.getElementById('student-profile-btn');
      if (btn) {
        const caret = btn.querySelector('.fa-caret-down');
        btn.innerHTML = `
          <img src="${escapeAttr(avatarUrl)}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid white;">
          ${caret ? caret.outerHTML : '<i class="fas fa-caret-down"></i>'}
        `;
      }
    }
    // Also update modal preview
    const modalPreview = document.getElementById('profile-preview');
    if (modalPreview) modalPreview.src = avatarUrl; // Direct property assignment is safe
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
          <div style="font-weight:500;">${escapeHtml(f.description || 'Fee')}</div>
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
  container.innerHTML = homework.map((hw, idx) => {
    const submission = window.studentSubmissionsMap.get(hw.id);
    const isSubmitted = !!submission;
    const isReviewed = submission && submission.status === 'reviewed';
    
    let statusBadge = '';
    let accentColor = '#667eea';
    let submitBtnHtml = `
      <button onclick="openSubmissionModal(${hw.id}, '${escapeAttr(hw.title)}', '${escapeAttr(hw.subject)}')" class="submit-btn" style="padding:4px 10px; background:var(--student-accent); color:white; border-radius:4px; font-size:0.8rem; border:none; cursor:pointer;">
        <i class="fas fa-file-upload"></i> Submit Work
      </button>
    `;
    
    if (isReviewed) {
      statusBadge = `<span style="background:#48bb78; color:white; padding: 2px 8px; border-radius:12px; font-size:0.7rem; font-weight:600; margin-left: 8px;">Reviewed</span>`;
      accentColor = '#48bb78';
      submitBtnHtml = `<span style="font-size:0.8rem; color:#48bb78; font-weight:600;"><i class="fas fa-check-circle"></i> Completed</span>`;
    } else if (isSubmitted) {
      statusBadge = `<span style="background:#ecc94b; color:#744210; padding: 2px 8px; border-radius:12px; font-size:0.7rem; font-weight:600; margin-left: 8px;">Submitted</span>`;
      accentColor = '#ecc94b';
      submitBtnHtml = `<span style="font-size:0.8rem; color:#d69e2e; font-weight:600;"><i class="fas fa-clock"></i> Pending Review</span>`;
    }
    
    let remarkHtml = '';
    if (isReviewed && submission.remark) {
      remarkHtml = `
        <div style="margin-top: 8px; padding: 8px; background: #f0fff4; border-radius: 4px; border-left: 3px solid #48bb78; font-size: 0.85rem; color: #2f855a;">
          <strong>Teacher Remark:</strong> ${escapeHtml(submission.remark)}
        </div>
      `;
    }

    return `
    <div class="homework-item card-clickable" id="hw-card-${hw.id}" onclick="openAssignmentDetailModal(${hw.id})" style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${accentColor}; cursor: pointer;">
      <div class="subject-icon" style="font-size: 1.5rem;">${getSubjectIcon(hw.subject)}</div>
      <div class="details" style="flex: 1;">
        <p class="subject-title" style="margin:0; font-weight: 600; color: #2d3748;">${escapeHtml(hw.subject || 'Homework')} - ${escapeHtml(hw.title || 'Assignment')}${statusBadge}</p>
        <p class="due-date" style="margin: 4px 0; font-size: 0.85rem; color: #718096;"><i class="fas fa-pencil-alt"></i> Due: ${formatDate(hw.dueDate)}</p>
        ${hw.description ? `
          <div class="assignment-description" style="margin: 8px 0; font-size: 0.9rem; color: #4a5568; line-height: 1.5; background: #f7fafc; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #cbd5e0;">
            ${window.DOMPurify ? DOMPurify.sanitize(marked.parse(hw.description)) : escapeHtml(hw.description)}
          </div>
        ` : ''}
        ${remarkHtml}
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 8px; align-items: center;">
          ${hw.attachmentUrl ? `
            <button onclick="downloadFile('${escapeAttr(hw.attachmentUrl)}', '${escapeAttr(safeFileName(hw.title || 'homework') + '.pdf')}')" class="download-btn" style="padding:4px 10px; background:#667eea; color:white; border-radius:4px; font-size:0.8rem; border:none; cursor:pointer;">
              <i class="fas fa-download"></i> Download
            </button>
          ` : ''}
          ${submitBtnHtml}
        </div>
      </div>
    </div>
  `}).join('');
}

function populateDailyPractice(practiceList) {
  const container = document.getElementById('daily-practice-container');
  if (!container) return;
  if (!Array.isArray(practiceList) || practiceList.length === 0) {
    container.innerHTML = '<p class="no-data">No daily practice assigned for today</p>';
    return;
  }
  container.innerHTML = practiceList.map((hw, idx) => {
    const submission = window.studentSubmissionsMap.get(hw.id);
    const isSubmitted = !!submission;
    const isReviewed = submission && submission.status === 'reviewed';
    
    let statusBadge = '';
    let accentColor = '#48bb78'; // DPP default accent
    let submitBtnHtml = `
      <button onclick="openSubmissionModal(${hw.id}, '${escapeAttr(hw.title)}', '${escapeAttr(hw.subject)}')" class="submit-btn" style="padding:4px 10px; background:var(--student-accent); color:white; border-radius:4px; font-size:0.8rem; border:none; cursor:pointer;">
        <i class="fas fa-file-upload"></i> Submit Work
      </button>
    `;
    
    if (isReviewed) {
      statusBadge = `<span style="background:#48bb78; color:white; padding: 2px 8px; border-radius:12px; font-size:0.7rem; font-weight:600; margin-left: 8px;">Reviewed</span>`;
      submitBtnHtml = `<span style="font-size:0.8rem; color:#48bb78; font-weight:600;"><i class="fas fa-check-circle"></i> Completed</span>`;
    } else if (isSubmitted) {
      statusBadge = `<span style="background:#ecc94b; color:#744210; padding: 2px 8px; border-radius:12px; font-size:0.7rem; font-weight:600; margin-left: 8px;">Submitted</span>`;
      accentColor = '#ecc94b';
      submitBtnHtml = `<span style="font-size:0.8rem; color:#d69e2e; font-weight:600;"><i class="fas fa-clock"></i> Pending Review</span>`;
    }
    
    let remarkHtml = '';
    if (isReviewed && submission.remark) {
      remarkHtml = `
        <div style="margin-top: 8px; padding: 8px; background: #f0fff4; border-radius: 4px; border-left: 3px solid #48bb78; font-size: 0.85rem; color: #2f855a;">
          <strong>Teacher Remark:</strong> ${escapeHtml(submission.remark)}
        </div>
      `;
    }

    return `
    <div class="homework-item card-clickable" id="dpp-card-${hw.id}" onclick="openAssignmentDetailModal(${hw.id})" style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${accentColor}; cursor: pointer;">
      <div class="subject-icon" style="font-size: 1.5rem;">${getSubjectIcon(hw.subject)}</div>
      <div class="details" style="flex: 1;">
        <p class="subject-title" style="margin:0; font-weight: 600; color: #2d3748;">${escapeHtml(hw.subject || 'Practice')} - ${escapeHtml(hw.title || 'Assignment')}${statusBadge}</p>
        <p class="due-date" style="margin: 4px 0; font-size: 0.85rem; color: #718096;"><i class="fas fa-pencil-alt"></i> Posted: ${new Date(hw.createdAt).toLocaleDateString()}</p>
        ${hw.description ? `
          <div class="assignment-description" style="margin: 8px 0; font-size: 0.9rem; color: #4a5568; line-height: 1.5; background: #f7fafc; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #cbd5e0;">
            ${window.DOMPurify ? DOMPurify.sanitize(marked.parse(hw.description)) : escapeHtml(hw.description)}
          </div>
        ` : ''}
        ${remarkHtml}
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 8px; align-items: center;">
          ${hw.attachmentUrl ? `
            <button onclick="downloadFile('${escapeAttr(hw.attachmentUrl)}', '${escapeAttr(safeFileName(hw.title || 'practice') + '.pdf')}')" class="download-btn" style="padding:4px 10px; background:#48bb78; color:white; border-radius:4px; font-size:0.8rem; border:none; cursor:pointer;">
              <i class="fas fa-download"></i> Download
            </button>
          ` : ''}
          ${submitBtnHtml}
        </div>
      </div>
    </div>
  `}).join('');
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
  
  if (descEl) {
    const descriptionText = latest.description || latest.title || 'New assignment';
    descEl.textContent = descriptionText.length > 50 ? descriptionText.substring(0, 50) + '...' : descriptionText;
  }
  if (dueEl) dueEl.textContent = `Due: ${formatDate(latest.dueDate)}`;

  // Add click handler to open details
  if (card) {
    card.addEventListener('click', () => {
      openAssignmentDetailModal(latest.id);
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
  
  if (descEl) {
    const descriptionText = latest.description || latest.title || 'New problems';
    descEl.textContent = descriptionText.length > 50 ? descriptionText.substring(0, 50) + '...' : descriptionText;
  }
  if (dateEl) dateEl.textContent = `Posted: ${formatDate(latest.createdAt)}`;

  // Add click handler to open details
  if (card) {
    card.addEventListener('click', () => {
      openAssignmentDetailModal(latest.id);
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
          <th>Teacher</th>
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
              <td class="teacher-col">${entry.teacher || 'N/A'}</td>
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
        <p>No classes scheduled</p>
      </div>
    `;
    return;
  }

  // Find ongoing and upcoming classes for TODAY
  const todayClasses = timetable.filter(entry => isDayToday(entry.dayOfWeek))
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

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

  // If no ongoing today, but there's an upcoming today, treat the upcoming as the primary "Next" class
  if (!ongoingClass && upcomingClass) {
    ongoingClass = upcomingClass;
    upcomingClass = todayClasses.find(
      cls => parseTimeToMinutes(cls.startTime) > parseTimeToMinutes(ongoingClass.startTime)
    );
  } 
  // If still nothing for today, find the very next class in the weekly cycle
  else if (!ongoingClass && !upcomingClass) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIdx = new Date().getDay();
    
    const sortedTimetable = [...timetable].sort((a, b) => {
      const dayA = (days.indexOf(a.dayOfWeek) - todayIdx + 7) % 7;
      const dayB = (days.indexOf(b.dayOfWeek) - todayIdx + 7) % 7;
      if (dayA !== dayB) return dayA - dayB;
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });
    
    ongoingClass = sortedTimetable[0];
    upcomingClass = sortedTimetable[1];
  }

  // Generate layout
  let html = '<div class="timetable-preview-container">';

  if (ongoingClass) {
    const status = getClassStatus(ongoingClass);
    const isActuallyOngoing = status === 'ongoing';
    html += `
      <div class="class-card class-card-ongoing">
        <div class="class-card-label">
          <i class="fas ${isActuallyOngoing ? 'fa-dot-circle' : 'fa-clock'}"></i>
          <span>${isActuallyOngoing ? 'Ongoing' : 'Next Class'}</span>
        </div>
        <div class="class-card-content">
          <div class="class-time">${formatTime(ongoingClass.startTime)} – ${formatTime(ongoingClass.endTime)}${!isDayToday(ongoingClass.dayOfWeek) ? ` (${ongoingClass.dayOfWeek})` : ''}</div>
          <div class="class-subject">${ongoingClass.subject || 'N/A'}</div>
          <div class="class-teacher" style="font-size: 0.85rem; color: #718096; margin-top: 4px;">
            <i class="fas fa-user-tie" style="margin-right: 5px;"></i>${ongoingClass.teacher || 'No teacher assigned'}
          </div>
        </div>
      </div>
    `;
  }

  if (upcomingClass) {
    html += `
      <div class="class-card class-card-upcoming">
        <div class="class-card-label">
          <i class="fas fa-clock"></i>
          <span>Upcoming</span>
        </div>
        <div class="class-card-content">
          <div class="class-time">${formatTime(upcomingClass.startTime)} – ${formatTime(upcomingClass.endTime)}${!isDayToday(upcomingClass.dayOfWeek) ? ` (${upcomingClass.dayOfWeek})` : ''}</div>
          <div class="class-subject">${upcomingClass.subject || 'N/A'}</div>
          <div class="class-teacher" style="font-size: 0.85rem; color: #718096; margin-top: 4px;">
            <i class="fas fa-user-tie" style="margin-right: 5px;"></i>${upcomingClass.teacher || 'No teacher assigned'}
          </div>
        </div>
      </div>
    `;
  }

  if (!ongoingClass && !upcomingClass) {
    html += `
      <div class="timetable-empty">
        <i class="fas fa-check-circle"></i>
        <p>No classes scheduled</p>
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
// ═══════════════════════════════════════════
// PROFILE & CMS LOGIC
// ═══════════════════════════════════════════

window.openEditProfileModal = async function() {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;
    
    resetStudentUploadProgress('profile');
    try {
        const userId = sessionStorage.getItem('studentUserId');
        const res = await studentAPI.getDashboard(userId);
        
        if (res.success && res.data && res.data.profile) {
            const p = res.data.profile;
            document.getElementById('edit-profile-name').value = p.name || '';
            document.getElementById('edit-profile-email').value = p.email || '';
            
            const fatherEl = document.getElementById('edit-profile-father-name');
            if (fatherEl) fatherEl.value = p.fatherName || '';
            
            const motherEl = document.getElementById('edit-profile-mother-name');
            if (motherEl) motherEl.value = p.motherName || '';
            
            const dobEl = document.getElementById('edit-profile-dob');
            if (dobEl) {
                let dobVal = '';
                if (p.dateOfBirth) {
                    dobVal = p.dateOfBirth.split('T')[0];
                }
                dobEl.value = dobVal;
            }
            
            if (p.avatar_url) {
                document.getElementById('profile-preview').src = p.avatar_url;
            } else {
                document.getElementById('profile-preview').src = './src/assets/images/default-avatar.png';
            }
            
            modal.style.display = 'flex';
        }
    } catch (err) {
        console.error('Failed to load profile details:', err);
    }
};

window.closeEditProfileModal = function() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.style.display = 'none';
    const fileInput = document.getElementById('profile-upload');
    if (fileInput) fileInput.value = '';
};

window.previewProfileImage = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        if (file.size > 200 * 1024) {
            alert('Image size exceeds 200KB limit.');
            input.value = '';
            return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('Only JPG, JPEG, and PNG files are allowed.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profile-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload to storage immediately to get Drive ID
        handleStudentFileUpload(file, 'profile', null, 'profile_pic').then(result => {
            if (result && result.success) {
                pendingProfileUpload = {
                    url: result.data.url,
                    id: result.data.id
                };
            }
        });
    }
};

document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('edit-profile-name').value;
    const fatherName = document.getElementById('edit-profile-father-name')?.value || '';
    const motherName = document.getElementById('edit-profile-mother-name')?.value || '';
    const dateOfBirth = document.getElementById('edit-profile-dob')?.value || '';
    const fileInput = document.getElementById('profile-upload');
    const file = fileInput.files[0];
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('fatherName', fatherName);
    formData.append('motherName', motherName);
    formData.append('dateOfBirth', dateOfBirth);
    
    if (pendingProfileUpload) {
        formData.append('avatarUrl', pendingProfileUpload.url);
        formData.append('avatarDriveId', pendingProfileUpload.id);
    }
    
    try {
        const res = await profileAPI.update(formData);
        if (res.success) {
            alert('Profile updated successfully!');
            closeEditProfileModal();
            const userId = sessionStorage.getItem('studentUserId');
            clearCache(userId, 'dashboard');
            loadDashboardData(userId);
        } else {
            alert(res.message || 'Failed to update profile');
        }
    } catch (err) {
        console.error('Profile update error:', err);
        alert('An error occurred while updating profile');
    }
});

window.openCMSModal = async function(type) {
    const modal = document.getElementById('cms-modal');
    const titleEl = document.getElementById('cms-modal-title');
    const bodyEl = document.getElementById('cms-modal-body');
    if (!modal || !bodyEl) return;
    
    const titles = {
        'help_support': 'Help & Support',
        'contact_us': 'Contact Us',
        'documentation': 'Documentation Guide',
        'about_us': 'About Us'
    };
    
    titleEl.textContent = titles[type] || 'Information';
    bodyEl.innerHTML = '<p class="loading-text">Loading content...</p>';
    modal.style.display = 'flex';
    
    try {
        const res = await contentAPI.get(type);
        if (res.success && res.data) {
            const rawContent = res.data.content || '';
            const m = window.marked;
            if (m) {
                try {
                    const parsed = (typeof m.parse === 'function') ? m.parse(rawContent) : m(rawContent);
                    const clean = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(parsed) : parsed;
                    bodyEl.innerHTML = `<div class="markdown-content">${clean}</div>`;
                } catch (e) {
                    console.error('Markdown error:', e);
                    const sanitized = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(rawContent) : escapeHtml(rawContent);
                    bodyEl.innerHTML = sanitized;
                }
            } else {
                const sanitized = rawContent 
                    ? ((typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(rawContent) : escapeHtml(rawContent))
                    : '<p class="empty-state">No content available.</p>';
                bodyEl.innerHTML = sanitized;
            }
        } else {
            bodyEl.innerHTML = '<p class="empty-state">Content not found.</p>';
        }
    } catch (err) {
        console.error('CMS load error:', err);
        bodyEl.innerHTML = '<p class="empty-state">Failed to load content.</p>';
    }
};

window.closeCMSModal = function() {
    const modal = document.getElementById('cms-modal');
    if (modal) modal.style.display = 'none';
};

// ===========================
// Submissions Logic
// ===========================

let isSubmissionsLoading = false;
async function loadSubmissions(userId) {
    if (isSubmissionsLoading) return;
    isSubmissionsLoading = true;
    const container = document.getElementById('submissions-list-container');
    if (!container) {
        isSubmissionsLoading = false;
        return;
    }

    try {
        container.innerHTML = '<p class="loading-text">Loading your submissions...</p>';
        const response = await studentAPI.getSubmissions(userId);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to fetch submissions');
        }

        const submissions = response.data || [];
        
        if (submissions.length === 0) {
            container.innerHTML = `
                <div class="no-assignments-container d-block">
                    <i class="fas fa-history no-assignments-icon opacity-1"></i>
                    <p class="no-assignments-title">No submissions yet</p>
                    <p class="no-assignments-text">You haven't submitted any homework or DPP yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${submissions.map(s => `
                    <div class="dashboard-card" style="background: white; padding: 1.5rem; border-radius: 12px; border-left: 4px solid ${s.status === 'reviewed' ? '#48bb78' : '#667eea'}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0; color: #2d3748; font-size: 1.1rem;">${escapeHtml(s.homework_title)}</h4>
                                <p style="margin: 4px 0; color: #718096; font-size: 0.85rem;">
                                    <span style="font-weight: 600;">${escapeHtml(s.subject)}</span> • Submitted on ${formatDate(s.submitted_at)}
                                </p>
                                
                                ${s.status === 'reviewed' ? `
                                    <div style="margin-top: 1rem; padding: 1rem; background: #f0fff4; border-radius: 8px; border: 1px solid #c6f6d5;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                            <span style="font-weight: 600; color: #22543d;">Teacher Review</span>
                                            <span style="font-weight: 700; color: #2f855a;">Score: ${s.marks || '--'}</span>
                                        </div>
                                        <p style="margin: 0; color: #276749; font-size: 0.9rem;">"${escapeHtml(s.remark_text || 'No remarks provided.')}"</p>
                                        <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.75rem; color: #48bb78; text-align: right;">Reviewed by ${escapeHtml(s.reviewer_name)}</p>
                                    </div>
                                ` : `
                                    <div style="margin-top: 1rem; padding: 0.75rem; background: #ebf4ff; border-radius: 8px; color: #2b6cb0; font-size: 0.9rem;">
                                        <i class="fas fa-clock"></i> Waiting for teacher review...
                                    </div>
                                `}
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                                <span class="badge" style="background: ${s.status === 'reviewed' ? '#c6f6d5' : '#e2e8f0'}; color: ${s.status === 'reviewed' ? '#22543d' : '#4a5568'}; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                                    ${s.status}
                                </span>
                                <button onclick="downloadFile('${escapeAttr(s.file_url)}', 'submission.pdf')" class="btn-sm" style="margin-top: 0.5rem; background: #edf2f7; color: #4a5568; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-eye"></i> View File
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error('[SUBMISSIONS] Error loading submissions:', err);
        container.innerHTML = `<p class="error" style="color: #e53e3e; text-align: center; padding: 1rem;">Failed to load submissions: ${err.message || 'Unknown error'}</p>`;
    } finally {
        isSubmissionsLoading = false;
    }
}

// Submission Modal Logic
window.openAssignmentDetailModal = function(id) {
  const item = window.currentAssignments.find(a => a.id === id);
  if (!item) {
    console.error('[DETAIL] Assignment not found:', id);
    return;
  }

  const modal = document.getElementById('assignment-detail-modal');
  const titleEl = document.getElementById('detail-modal-title');
  const bodyEl = document.getElementById('detail-modal-content');
  const footerEl = document.getElementById('detail-modal-footer');

  if (!modal || !bodyEl) return;

  const isHomework = item.type === 'homework';
  titleEl.textContent = isHomework ? 'Homework Details' : 'Practice Details';

  // Format dates
  const dueDateStr = item.dueDate ? formatDate(item.dueDate) : 'No due date';
  const postedDateStr = item.createdAt ? formatDate(item.createdAt) : '--';

  // Submission status
  const submission = window.studentSubmissionsMap.get(item.id);
  const isSubmitted = !!submission;
  const isReviewed = submission && submission.status === 'reviewed';

  let statusBadge = '';
  if (isReviewed) {
    statusBadge = `<span style="background:#48bb78; color:white; padding: 4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600;">Reviewed</span>`;
  } else if (isSubmitted) {
    statusBadge = `<span style="background:#ecc94b; color:#744210; padding: 4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600;">Submitted</span>`;
  } else {
    statusBadge = `<span style="background:#cbd5e0; color:#4a5568; padding: 4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600;">Pending</span>`;
  }

  bodyEl.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="margin: 0 0 0.5rem 0; color: var(--text-main); font-size: 1.4rem;">${escapeHtml(item.title)}</h2>
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
        <span style="color: var(--student-accent); font-weight: 600;">${escapeHtml(item.subject || 'General')}</span>
        ${statusBadge}
      </div>
      <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; font-size: 0.9rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div><i class="fas fa-calendar-alt"></i> Posted: ${postedDateStr}</div>
        <div><i class="fas fa-clock"></i> Due: ${dueDateStr}</div>
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <h4 style="margin-bottom: 0.5rem; color: var(--text-main);">Description</h4>
      <div class="detail-description-box" style="padding: 1rem; background: white; border: 1px solid var(--border-color); border-radius: 8px; line-height: 1.6;">
        ${window.DOMPurify ? DOMPurify.sanitize(marked.parse(item.description || 'No description provided.')) : escapeHtml(item.description || 'No description provided.')}
      </div>
    </div>

    ${item.attachmentUrl ? `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 0.5rem; color: var(--text-main);">Attachment</h4>
        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #ebf4ff; border-radius: 8px; border: 1px solid #bee3f8;">
          <i class="fas fa-file-pdf" style="font-size: 2rem; color: #3182ce;"></i>
          <div style="flex: 1;">
            <p style="margin: 0; font-weight: 600; font-size: 0.9rem; color: #2b6cb0;">${escapeHtml(safeFileName(item.title) + '.pdf')}</p>
          </div>
          <button onclick="downloadFile('${escapeAttr(item.attachmentUrl)}', '${escapeAttr(safeFileName(item.title) + '.pdf')}')" class="modal-btn modal-btn-primary" style="padding: 0.5rem 1rem;">
            <i class="fas fa-download"></i> Download
          </button>
        </div>
      </div>
    ` : ''}

    ${isReviewed && submission.remark ? `
      <div style="margin-top: 1.5rem; padding: 1rem; background: #f0fff4; border-radius: 8px; border-left: 4px solid #48bb78;">
        <h4 style="margin: 0 0 0.5rem 0; color: #2f855a;"><i class="fas fa-comment-dots"></i> Teacher's Remark</h4>
        <p style="margin: 0; font-size: 0.95rem; color: #276749;">${escapeHtml(submission.remark)}</p>
      </div>
    ` : ''}
  `;

  // Update footer with context-aware buttons
  footerEl.innerHTML = `
    <button type="button" class="modal-btn modal-btn-secondary" onclick="closeAssignmentDetailModal()">Close</button>
    ${!isReviewed ? `
      <button onclick="openSubmissionModal(${item.id}, '${escapeAttr(item.title)}', '${escapeAttr(item.subject)}'); closeAssignmentDetailModal();" class="modal-btn modal-btn-primary">
        <i class="fas fa-file-upload"></i> ${isSubmitted ? 'Resubmit Work' : 'Submit Work'}
      </button>
    ` : ''}
  `;

  modal.style.display = 'flex';
};

window.closeAssignmentDetailModal = function() {
  const modal = document.getElementById('assignment-detail-modal');
  if (modal) modal.style.display = 'none';
};

window.openSubmissionModal = function(hwId, title, subject) {
    const modal = document.getElementById('homework-submission-modal');
    if (!modal) return;
    
    resetStudentUploadProgress('student-hw');
    document.getElementById('submit-homework-id').value = hwId;
    document.getElementById('submit-hw-title').textContent = title;
    document.getElementById('submit-hw-subject').textContent = `Subject: ${subject}`;
    
    // Reset form
    document.getElementById('homework-submission-form').reset();
    resetFileInfo();
    
    modal.style.display = 'flex';
};

function resetFileInfo() {
    const infoZone = document.getElementById('selected-file-info');
    const dropZone = document.getElementById('submission-drop-zone');
    if (infoZone) infoZone.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
}

// Modal closing helpers
const closeBtn = document.getElementById('close-submission-modal');
const cancelBtn = document.getElementById('cancel-submission-btn');
const subModal = document.getElementById('homework-submission-modal');

if (closeBtn) closeBtn.onclick = () => subModal.style.display = 'none';
if (cancelBtn) cancelBtn.onclick = () => subModal.style.display = 'none';

// File Upload Handlers
const fileInput = document.getElementById('homework-file-input');
const dropZone = document.getElementById('submission-drop-zone');
const removeFileBtn = document.getElementById('remove-file-btn');

if (dropZone) {
    dropZone.onclick = () => fileInput.click();
    
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-zone-active');
    };
    
    dropZone.ondragleave = () => {
        dropZone.classList.remove('drop-zone-active');
    };
    
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-zone-active');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };
}

if (fileInput) {
    fileInput.onchange = async (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            handleFileSelect(file);
            
            // Immediate upload
            const result = await handleStudentFileUpload(file, 'student-hw', 'submit-btn', 'homework');
            if (result) pendingSubmissionUpload = result;
        }
    };
}

const profileUpload = document.getElementById('profile-upload');
if (profileUpload) {
    profileUpload.onchange = async (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            window.previewProfileImage(profileUpload);
            
            // Immediate upload
            const result = await handleStudentFileUpload(file, 'profile', null, 'profile');
            if (result) pendingProfileUpload = result;
        }
    };
}

if (removeFileBtn) {
    removeFileBtn.onclick = (e) => {
        e.stopPropagation();
        fileInput.value = '';
        resetFileInfo();
    };
}

function handleFileSelect(file) {
    const infoZone = document.getElementById('selected-file-info');
    const dropZone = document.getElementById('submission-drop-zone');
    const nameDisplay = document.getElementById('file-name-display');
    const icon = document.getElementById('file-icon');
    
    if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        fileInput.value = '';
        return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        alert('Only JPG, PNG and PDF files are allowed.');
        fileInput.value = '';
        return;
    }
    
    nameDisplay.textContent = file.name;
    if (file.type.includes('image')) {
        icon.className = 'fas fa-file-image file-icon-img';
    } else {
        icon.className = 'fas fa-file-pdf file-icon-pdf';
    }
    
    dropZone.classList.add('d-none');
    infoZone.classList.add('d-block');
}

// Submission Form Handler
document.getElementById('homework-submission-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const hwId = document.getElementById('submit-homework-id').value;
    const file = fileInput.files[0];
    const submitBtn = document.getElementById('submit-btn');
    
    if (!file) {
        alert('Please select a file to submit');
        return;
    }
    
    const formData = new FormData();
    formData.append('homeworkId', hwId);
    if (pendingSubmissionUpload) {
        const attachmentId = pendingSubmissionUpload.data?.id || pendingSubmissionUpload.data?.fileId || pendingSubmissionUpload.id;
        const fileUrl = pendingSubmissionUpload.data?.url || pendingSubmissionUpload.data?.downloadLink || pendingSubmissionUpload.url;
        formData.append('attachmentId', attachmentId);
        formData.append('fileUrl', fileUrl);
    } else if (file) {
        // Fallback for safety, though UI should prevent this
        formData.append('submission', file);
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        const res = await submissionsAPI.submit(formData);
        
        if (res.success) {
            alert('Homework submitted successfully!');
            subModal.style.display = 'none';
            // Clear cache to reflect submission in dashboard stats/list
            const userId = sessionStorage.getItem('studentUserId');
            clearCache(userId, 'dashboard');
            
            // Dynamically update map to avoid immediate refetch
            window.studentSubmissionsMap.set(parseInt(hwId), { 
                homework_id: parseInt(hwId), 
                status: 'submitted', 
                student_id: userId,
                submitted_at: new Date().toISOString()
            });
            
            // Re-render dashboard using existing functions if data is available
            // This is an AJAX soft-refresh
            loadDashboardData(userId);
            
            // Reload submissions tab if active
            loadSubmissions(userId);
        } else {
            alert(res.error || 'Failed to submit homework');
        }
    } catch (err) {
        console.error('Submission error:', err);
        alert('An error occurred during submission. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Now';
    }
});

// ===========================
// Assignment Selector Logic
// ===========================

let activeAssignments = [];
let isSelectorLoading = false;

window.openAssignmentSelector = async function() {
    if (isSelectorLoading) return;
    isSelectorLoading = true;

    console.log('[SUBMISSIONS] Opening assignment selector...');
    const modal = document.getElementById('select-assignment-modal');
    const homeworkGroup = document.getElementById('optgroup-homework-custom');
    const dppGroup = document.getElementById('optgroup-dpp-custom');
    const labelHomework = document.getElementById('label-homework');
    const labelDpp = document.getElementById('label-dpp');
    const dropdown = document.getElementById('active-assignments-dropdown');
    const noAssignmentsMsg = document.getElementById('no-assignments-msg');
    const dropdownGroup = document.getElementById('assignments-dropdown-container')?.closest('.form-group');
    const proceedBtn = document.getElementById('proceed-to-submit-btn');

    if (!modal) {
        console.error('[SUBMISSIONS] select-assignment-modal not found!');
        return;
    }

    try {
        // Reset state
        if (dropdown) dropdown.value = '';
        document.getElementById('custom-dropdown-selected').textContent = '-- Choose Assignment --';
        document.getElementById('assignments-dropdown-container')?.classList.remove('open');
        document.getElementById('custom-dropdown-menu')?.classList.remove('open');
        document.getElementById('assignment-details-preview').classList.add('d-none');
        document.getElementById('assignment-details-preview').classList.remove('d-block');
        proceedBtn.disabled = true;
        proceedBtn.classList.add('opacity-60', 'cursor-not-allowed');
        proceedBtn.classList.remove('opacity-100', 'cursor-pointer');
        
        modal.classList.add('d-flex');
        modal.classList.remove('d-none');
        
        if (homeworkGroup) homeworkGroup.innerHTML = '';
        if (dppGroup) dppGroup.innerHTML = '';
        if (dropdownGroup) {
            dropdownGroup.classList.add('d-none');
            dropdownGroup.classList.remove('d-block');
        }
        noAssignmentsMsg.classList.add('d-none');
        noAssignmentsMsg.classList.remove('d-block');
        
        console.log('[SUBMISSIONS] Fetching active assignments...');
        const res = await assignmentsAPI.getActive();
        console.log('[SUBMISSIONS] Assignments response:', res);
        
        if (res.success && res.data) {
            console.log(`[SUBMISSIONS] Found ${res.data.length} total active assignments`);
            // Only filter out assignments that are already SUBMITTED AND REVIEWED
            // "Submitted but Not Reviewed" stays in the list so students can update/replace if needed
            const rawData = res.data || [];
            
            // Deduplicate by ID to ensure unique entries even if API or events double-fire
            const uniqueMap = new Map();
            rawData.forEach(item => {
                if (item && item.id) uniqueMap.set(item.id, item);
            });
            
            const deduplicatedData = Array.from(uniqueMap.values());

            activeAssignments = deduplicatedData.filter(a => {
                const sub = window.studentSubmissionsMap.get(a.id);
                if (!sub) return true; // Not submitted yet
                return sub.status !== 'reviewed'; // Hide only if reviewed
            });
            console.log(`[SUBMISSIONS] After deduplication and filtering (hide reviewed), ${activeAssignments.length} assignments remain`);

            const homework = activeAssignments.filter(a => a.type === 'homework' || !a.type);
            const dpp = activeAssignments.filter(a => a.type === 'daily_practice' || a.type === 'dpp');
            
            if (homework.length === 0 && dpp.length === 0) {
                noAssignmentsMsg.classList.add('d-block');
                noAssignmentsMsg.classList.remove('d-none');
            } else {
                if (dropdownGroup) {
                    dropdownGroup.classList.add('d-block');
                    dropdownGroup.classList.remove('d-none');
                }
                
                if (labelHomework) labelHomework.style.display = homework.length === 0 ? 'none' : 'block';
                if (labelDpp) labelDpp.style.display = dpp.length === 0 ? 'none' : 'block';
                
                homework.forEach(hw => {
                    const option = document.createElement('div');
                    option.className = 'custom-dropdown-option';
                    option.dataset.value = hw.id;
                    option.textContent = hw.title;
                    option.onclick = () => window.handleAssignmentSelection(hw.id);
                    homeworkGroup.appendChild(option);
                });
                
                dpp.forEach(item => {
                    const option = document.createElement('div');
                    option.className = 'custom-dropdown-option';
                    option.dataset.value = item.id;
                    option.textContent = item.title;
                    option.onclick = () => window.handleAssignmentSelection(item.id);
                    dppGroup.appendChild(option);
                });
            }
        }
    } catch (err) {
        console.error('Failed to load active assignments:', err);
        alert('Could not load assignments. Please try again.');
    } finally {
        isSelectorLoading = false;
    }
};

window.handleAssignmentSelection = function(id) {
    const hiddenInput = document.getElementById('active-assignments-dropdown');
    const selectedText = document.getElementById('custom-dropdown-selected');
    const preview = document.getElementById('assignment-details-preview');
    const proceedBtn = document.getElementById('proceed-to-submit-btn');
    
    // Update hidden input
    if (hiddenInput) hiddenInput.value = id;
    
    // Close dropdown
    document.getElementById('assignments-dropdown-container')?.classList.remove('open');
    document.getElementById('custom-dropdown-menu')?.classList.remove('open');
    
    if (!id) {
        if (selectedText) selectedText.textContent = '-- Choose Assignment --';
        preview.classList.add('d-none');
        preview.classList.remove('d-block');
        proceedBtn.disabled = true;
        proceedBtn.classList.add('opacity-60', 'cursor-not-allowed');
        proceedBtn.classList.remove('opacity-100', 'cursor-pointer');
        return;
    }
    
    const assignment = activeAssignments.find(a => a.id == id);
    if (assignment) {
        if (selectedText) selectedText.textContent = assignment.title;
        document.getElementById('preview-title').textContent = assignment.title;
        document.getElementById('preview-subject').textContent = `Subject: ${assignment.subject || assignment.subjectName || '--'}`;
        document.getElementById('preview-due').textContent = assignment.dueDate ? `Due Date: ${formatDate(assignment.dueDate)}` : 'Due Date: --';
        
        preview.classList.add('d-block');
        preview.classList.remove('d-none');
        proceedBtn.disabled = false;
        proceedBtn.classList.add('opacity-100', 'cursor-pointer');
        proceedBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        
        // Update selected state visually
        document.querySelectorAll('.custom-dropdown-option').forEach(el => {
            if (el.dataset.value == id) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }
};

// Custom Dropdown Open/Close Logic
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('custom-dropdown-trigger')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const container = document.getElementById('assignments-dropdown-container');
        const menu = document.getElementById('custom-dropdown-menu');
        const trigger = e.currentTarget;
        
        if (menu && container) {
            const isOpen = menu.classList.contains('open');
            
            if (!isOpen) {
                // Calculate space
                const rect = trigger.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const menuHeight = 250; // Match max-height in CSS
                
                if (spaceBelow < menuHeight && rect.top > menuHeight) {
                    menu.classList.add('opens-upward');
                } else {
                    menu.classList.remove('opens-upward');
                }
            }
            
            container.classList.toggle('open');
            menu.classList.toggle('open');
        }
    });

    document.addEventListener('click', (e) => {
        const container = document.getElementById('assignments-dropdown-container');
        const menu = document.getElementById('custom-dropdown-menu');
        if (container && menu && !container.contains(e.target)) {
            container.classList.remove('open');
            menu.classList.remove('open');
        }
    });
});


document.getElementById('open-assignment-selector-btn')?.addEventListener('click', () => {
    window.openAssignmentSelector();
});

// Old native select event listener removed, logic moved to window.handleAssignmentSelection

document.getElementById('proceed-to-submit-btn')?.addEventListener('click', () => {
    const dropdown = document.getElementById('active-assignments-dropdown');
    const id = dropdown.value;
    if (!id) return;
    
    const assignment = activeAssignments.find(a => a.id == id);
    if (assignment) {
        document.getElementById('select-assignment-modal').classList.add('d-none');
        document.getElementById('select-assignment-modal').classList.remove('d-flex');
        window.openSubmissionModal(assignment.id, assignment.title, assignment.subject || assignment.subjectName || '--');
    }
});

// Modal close handlers for the selector
document.getElementById('close-select-assignment-modal')?.addEventListener('click', () => {
    document.getElementById('select-assignment-modal').classList.add('d-none');
    document.getElementById('select-assignment-modal').classList.remove('d-flex');
});
document.getElementById('cancel-select-assignment-btn')?.addEventListener('click', () => {
    document.getElementById('select-assignment-modal').classList.add('d-none');
    document.getElementById('select-assignment-modal').classList.remove('d-flex');
});

/**
 * Handle student file uploads with progress
 */
async function handleStudentFileUpload(file, prefix, submitBtnId, type = 'homework') {
    const container = document.getElementById(`${prefix}-upload-progress`);
    const statusText = document.getElementById(`${prefix}-upload-status`);
    const percentText = document.getElementById(`${prefix}-upload-percent`);
    const progressBar = document.getElementById(`${prefix}-upload-bar`);
    const submitBtn = submitBtnId ? document.getElementById(submitBtnId) : null;

    if (container) container.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type); // Required by backend storageController

        const result = await uploadFileWithProgress('/storage/upload', formData, (percent) => {
            if (percentText) percentText.textContent = `${percent}%`;
            if (progressBar) progressBar.style.width = `${percent}%`;
        });

        if (statusText) statusText.textContent = 'Upload Complete';
        if (submitBtn) submitBtn.disabled = false;
        return result;
    } catch (err) {
        if (statusText) statusText.textContent = 'Upload Failed';
        if (progressBar) progressBar.style.background = 'var(--danger)';
        if (submitBtn) submitBtn.disabled = false;
        console.error('Upload error:', err);
        alert('Upload failed: ' + (err.error || err.message));
        return null;
    }
}

/**
 * Reset upload progress UI and pending state
 */
function resetStudentUploadProgress(prefix) {
    const container = document.getElementById(`${prefix}-upload-progress`);
    const statusText = document.getElementById(`${prefix}-upload-status`);
    const percentText = document.getElementById(`${prefix}-upload-percent`);
    const progressBar = document.getElementById(`${prefix}-upload-bar`);
    
    if (container) container.style.display = 'none';
    if (statusText) statusText.textContent = 'Uploading...';
    if (percentText) percentText.textContent = '0%';
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.background = 'var(--student-accent)';
    }
    
    // Clear pending state
    if (prefix === 'student-hw') pendingSubmissionUpload = null;
    if (prefix === 'profile') pendingProfileUpload = null;
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
            // Clear inputs if profile modal
            if (modal.id === 'edit-profile-modal') {
                const fileInput = document.getElementById('profile-upload');
                if (fileInput) fileInput.value = '';
            }
        }
    });
});

// ============================================
// DOUBTS MODULE (STUDENT SIDE)
// ============================================

let pendingDoubtUpload = null;

async function loadStudentDoubtsTab() {
  try {
    const doubtsList = document.getElementById('student-doubts-list');
    if (doubtsList) {
      doubtsList.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Loading doubts...</p>';
    }

    // Load subjects to populate dropdown
    const classEl = document.getElementById('dropdown-student-class');
    const sectionEl = document.getElementById('dropdown-student-section');
    const classText = classEl ? classEl.textContent : '';
    const sectionText = sectionEl ? sectionEl.textContent : '';
    
    const classMatch = classText.match(/Class: (\d+)/i);
    const studentClass = classMatch ? classMatch[1] : '';
    const studentSection = sectionText !== 'N/A' ? sectionText : '';

    const { subjectsAPI } = await import('../../core/api.js');
    const subjectsRes = await subjectsAPI.getAll(studentClass, studentSection);

    if (subjectsRes && subjectsRes.success) {
      window.studentSubjectsList = subjectsRes.data || [];
      const subjectSelect = document.getElementById('doubt-subject-select');
      if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">-- Choose Subject --</option>';
        window.studentSubjectsList.forEach(assignment => {
          const opt = document.createElement('option');
          opt.value = assignment.subject_id;
          opt.textContent = `${assignment.name || assignment.master_name} (${assignment.teacher_name || 'No Teacher'})`;
          subjectSelect.appendChild(opt);
        });
      }
    }

    // Load Past Doubts
    const doubtsRes = await doubtsAPI.getStudentDoubts();
    if (doubtsRes && doubtsRes.success) {
      renderStudentDoubtsList(doubtsRes.data || []);
    } else {
      if (doubtsList) {
        doubtsList.innerHTML = `<p class="empty-state" style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Failed to load doubts: ${doubtsRes.error || 'Unknown error'}</p>`;
      }
    }
  } catch (err) {
    console.error('Error loading doubts tab:', err);
  }
}

function renderStudentDoubtsList(doubts) {
  const container = document.getElementById('student-doubts-list');
  if (!container) return;

  if (doubts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px; text-align: center;">
        <i class="fas fa-question-circle" style="font-size: 3rem; color: var(--text-muted); opacity: 0.3; margin-bottom: 15px;"></i>
        <p style="color: var(--text-muted); font-size: 0.95rem;">You have not asked any doubts yet. Ask your first doubt using the form!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = doubts.map(d => {
    const isAnswered = d.status === 'answered';
    return `
      <div class="homework-item" style="flex-direction: column; align-items: stretch; padding: 1.5rem; border: 1px solid var(--ghost-border); border-radius: var(--radius-sm); background: var(--bg-secondary); margin-bottom: 15px; box-shadow: var(--shadow);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; gap: 10px;">
          <span class="notification-badge ${isAnswered ? 'global' : ''}" style="margin: 0; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: uppercase;">
            ${isAnswered ? '<i class="fas fa-check-circle"></i> Answered' : '<i class="fas fa-clock"></i> Pending'}
          </span>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-variant-numeric: tabular-nums;">
            ${formatDate(d.createdAt)}
          </span>
        </div>
        <h4 style="margin: 0 0 8px 0; font-size: 1.05rem; color: var(--text-main); font-weight: 600;">${escapeHtml(d.title)}</h4>
        <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 10px;">
          Subject: <span style="color: var(--text-main); font-weight: 500;">${escapeHtml(d.subjectName || 'Unknown Subject')}</span> | 
          Teacher: <span style="color: var(--text-main); font-weight: 500;">${escapeHtml(d.teacherName || 'Not Assigned')}</span>
        </p>
        <p style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; background: var(--bg-primary); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent-blue); line-height: 1.4; white-space: pre-wrap;">${escapeHtml(d.description)}</p>
        
        ${d.attachmentUrl ? `
          <button onclick="downloadFile('${escapeAttr(d.attachmentUrl)}', 'doubt_attachment')" class="btn-secondary" style="align-self: flex-start; margin-bottom: 10px; padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.03); border: 1px solid var(--ghost-border); cursor: pointer; color: var(--text-main);">
            <i class="fas fa-paperclip"></i> View Attached File
          </button>
        ` : ''}

        ${isAnswered ? `
          <div style="margin-top: 15px; padding: 15px; background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px;">
            <h5 style="color: var(--accent-green); margin: 0 0 8px 0; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-comment-dots"></i> Teacher's Reply (${formatDate(d.answeredAt)}):
            </h5>
            <p style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 10px; line-height: 1.4; white-space: pre-wrap;">${escapeHtml(d.solutionText)}</p>
            ${d.solutionAttachmentUrl ? `
              <button onclick="downloadFile('${escapeAttr(d.solutionAttachmentUrl)}', 'solution_file')" class="btn-submit-assignment" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; background: var(--gradient-primary); color: white; border: none;">
                <i class="fas fa-download"></i> Download Solution Attachment
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Subject select event listener to auto-populate teacher
const doubtSubjectSelect = document.getElementById('doubt-subject-select');
if (doubtSubjectSelect) {
  doubtSubjectSelect.addEventListener('change', (e) => {
    const selectedSubId = e.target.value;
    const teacherSelect = document.getElementById('doubt-teacher-select');
    
    if (!selectedSubId || !window.studentSubjectsList) {
      if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">-- Auto-selected Teacher --</option>';
        teacherSelect.disabled = true;
        teacherSelect.classList.add('cursor-not-allowed');
      }
      return;
    }

    const assignment = window.studentSubjectsList.find(a => String(a.subject_id) === String(selectedSubId));
    if (teacherSelect && assignment) {
      teacherSelect.innerHTML = `<option value="${assignment.teacher_id}" selected>${escapeHtml(assignment.teacher_name || 'No assigned teacher')}</option>`;
      teacherSelect.disabled = false;
      teacherSelect.classList.remove('cursor-not-allowed');
    }
  });
}

// File upload drag & drop for doubts
const doubtFileInput = document.getElementById('doubt-file-input');
const doubtDropZone = document.getElementById('doubt-drop-zone');
const doubtRemoveFileBtn = document.getElementById('doubt-remove-file-btn');

if (doubtDropZone) {
  doubtDropZone.onclick = () => doubtFileInput.click();
  
  doubtDropZone.ondragover = (e) => {
    e.preventDefault();
    doubtDropZone.classList.add('drop-zone-active');
  };
  
  doubtDropZone.ondragleave = () => {
    doubtDropZone.classList.remove('drop-zone-active');
  };
  
  doubtDropZone.ondrop = (e) => {
    e.preventDefault();
    doubtDropZone.classList.remove('drop-zone-active');
    if (e.dataTransfer.files.length) {
      doubtFileInput.files = e.dataTransfer.files;
      handleDoubtFileSelect(e.dataTransfer.files[0]);
    }
  };
}

if (doubtFileInput) {
  doubtFileInput.onchange = async (e) => {
    if (e.target.files.length) {
      const file = e.target.files[0];
      const valid = handleDoubtFileSelect(file);
      if (valid) {
        // Immediate upload to R2
        const result = await handleStudentFileUpload(file, 'doubt', 'submit-doubt-btn', 'doubt');
        if (result) {
          pendingDoubtUpload = result;
        }
      }
    }
  };
}

function handleDoubtFileSelect(file) {
  const infoZone = document.getElementById('doubt-selected-file-info');
  const dropZone = document.getElementById('doubt-drop-zone');
  const nameDisplay = document.getElementById('doubt-file-name-display');
  const icon = document.getElementById('doubt-file-icon');
  
  if (file.size > 10 * 1024 * 1024) {
    alert('File size exceeds 10MB limit.');
    if (doubtFileInput) doubtFileInput.value = '';
    return false;
  }
  
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    alert('Only PDF, JPG, PNG, WEBP and DOC/DOCX files are allowed.');
    if (doubtFileInput) doubtFileInput.value = '';
    return false;
  }
  
  if (nameDisplay) nameDisplay.textContent = file.name;
  if (icon) {
    if (ext === '.pdf') {
      icon.className = 'fas fa-file-pdf file-display-icon-pdf';
    } else if (ext === '.doc' || ext === '.docx') {
      icon.className = 'fas fa-file-word file-display-icon-word';
    } else {
      icon.className = 'fas fa-file-image file-display-icon-img';
    }
  }
  
  if (dropZone) dropZone.style.display = 'none';
  if (infoZone) {
    infoZone.classList.remove('hidden-tab');
    infoZone.classList.add('d-block');
  }
  return true;
}

if (doubtRemoveFileBtn) {
  doubtRemoveFileBtn.onclick = (e) => {
    e.stopPropagation();
    const infoZone = document.getElementById('doubt-selected-file-info');
    const dropZone = document.getElementById('doubt-drop-zone');
    
    if (doubtFileInput) doubtFileInput.value = '';
    pendingDoubtUpload = null;
    resetStudentUploadProgress('doubt');
    
    if (infoZone) {
      infoZone.classList.add('hidden-tab');
      infoZone.classList.remove('d-block');
    }
    if (dropZone) dropZone.style.display = 'flex';
  };
}

// Handle ask doubt form submit
const askDoubtForm = document.getElementById('ask-doubt-form');
if (askDoubtForm) {
  askDoubtForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const subjectId = document.getElementById('doubt-subject-select').value;
    const teacherId = document.getElementById('doubt-teacher-select').value;
    const title = document.getElementById('doubt-title').value;
    const description = document.getElementById('doubt-description').value;
    const submitBtn = document.getElementById('submit-doubt-btn');

    if (!subjectId || !teacherId || !title.trim() || !description.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
      const payload = {
        subjectId,
        teacherId,
        title,
        description,
        attachmentUrl: pendingDoubtUpload ? (pendingDoubtUpload.data?.url || pendingDoubtUpload.data?.downloadLink || pendingDoubtUpload.url) : null
      };

      const res = await doubtsAPI.create(payload);
      if (res && res.success) {
        alert('Doubt submitted successfully!');
        
        // Reset form
        askDoubtForm.reset();
        
        // Trigger remove file behavior to clear drop zone
        if (doubtRemoveFileBtn) doubtRemoveFileBtn.click();
        
        // Reload list
        loadStudentDoubtsTab();
      } else {
        alert('Failed to submit doubt: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error submitting doubt:', err);
      alert('An error occurred while submitting your doubt.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Doubt';
      }
    }
  });
}



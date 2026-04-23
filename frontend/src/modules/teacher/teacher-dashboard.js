import { teacherAPI, subjectsAPI, downloadFile } from '../../core/api.js';
import { requireRole, getUserId, syncToSessionStorage, logout as authLogout, getUserName } from '../../core/auth-manager.js';
import { escapeHtml } from '../../core/sanitize.js';
import { formatDate } from '../../core/utils.js';

// ═══════════════════════════════════════════
// ROUTE PROTECTION - Must be first
// ═══════════════════════════════════════════
requireRole('teacher');

// ═══════════════════════════════════════════
// Remove Protection Screen
// ═══════════════════════════════════════════
function hideProtectionScreen() {
  const screen = document.getElementById('auth-protection-screen');
  if (screen) {
    screen.style.display = 'none';
  }
}

// Global logout handler
window.handleLogout = function () {
  authLogout();
};

// ─── Auth State ───────────────────────────────────────────────────────────────
let teacherId = null;
let teacherPhone = null;

// ─── State ────────────────────────────────────────────────────────────────────
let allHomework = [];
let allMaterials = [];
let allSyllabus = [];
let allTimetable = [];
let availableClasses = [];
let showAllMaterials = false;

// ─── Day helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayName() { return DAY_NAMES[new Date().getDay()]; }

function normalizeDayName(day) {
  if (!day) return null;
  const normalized = day.trim().toLowerCase();
  const found = DAY_NAMES.find(d => d.toLowerCase() === normalized);
  if (found) return found;
  const dayNum = parseInt(day);
  if (!isNaN(dayNum) && dayNum >= 0 && dayNum < 7) return DAY_NAMES[dayNum];
  return day;
}

function formatTime(t) {
  if (!t) return '';
  try {
    const [h, m] = t.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return t; }
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':');
  return +h * 60 + +m;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

// ─── Live clock ───────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('live-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
setInterval(updateClock, 1000);
updateClock();

// ─── Tab Switching ────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      // Remove active class from all nav links
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      // Hide all tab content
      document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
      // Add active class to all matching nav links (both regular and bottom nav)
      document.querySelectorAll(`[data-tab="${tab}"]`).forEach(l => l.classList.add('active'));
      // Show the corresponding tab content
      const el = document.getElementById(`tab-${tab}`);
      if (el) el.style.display = 'block';

      if (tab === 'dashboard') loadDashboard();
      if (tab === 'subjects') loadTeacherSubjects();
      if (tab === 'homework') { loadHomework(); populateSharedDropdowns('hw'); }
      if (tab === 'materials') { loadMaterials(); populateSharedDropdowns('mat'); }
      if (tab === 'timetable') renderWeeklyTimetable();
      if (tab === 'syllabus') { loadSyllabus(); setupSyllabusDropdowns(); }
      if (tab === 'attendance') { initAttendanceTab(); initSummaryTab(); }
      if (tab === 'exam') initExamTab();
    });
  });
}

// ─── TEACHER SUBJECTS ──────────────────────────────────────────────────────────
async function loadTeacherSubjects() {
    const tbody = document.getElementById('teacher-subjects-body');
    if (!tbody) return;

    try {
        const res = await subjectsAPI.getTeacherSubjects();
        const data = res.data || [];
        
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No subjects assigned to you yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.master_name || s.name)}</strong></td>
                <td><span class="badge">Class ${escapeHtml(s.class_level || s.classLevel)}</span></td>
                <td><span class="badge secondary">${escapeHtml(s.section || 'All Sections')}</span></td>
                <td>${formatDate(s.created_at || s.createdAt)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load teacher subjects:', err);
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state text-danger">Failed to load assigned subjects.</td></tr>';
    }
}

/**
 * Populate subject dropdown based on class and section
 */
async function populateSubjectDropdown(classLevel, section, selectIds) {
    const ids = Array.isArray(selectIds) ? selectIds : [selectIds];
    if (!classLevel) {
        ids.forEach(id => {
            const sel = typeof id === 'string' ? document.getElementById(id) : id;
            if (sel) sel.innerHTML = '<option value="">-- Select Class First --</option>';
        });
        return;
    }

    try {
        const res = await subjectsAPI.getTeacherSubjects();
        const allSubjects = res.data || [];
        
        // Filter by class and (optionally) section
        const filtered = allSubjects.filter(s => {
            const classMatch = s.class_level === classLevel || s.classLevel === classLevel;
            const sectionMatch = !s.section || s.section === section;
            return classMatch && sectionMatch;
        });

        ids.forEach(id => {
            const sel = typeof id === 'string' ? document.getElementById(id) : id;
            if (!sel) return;
            
            const currentVal = sel.value;
            if (filtered.length === 0) {
                sel.innerHTML = '<option value="">No subjects found</option>';
            } else {
                sel.innerHTML = '<option value="">Select Subject</option>';
                const uniqueNames = [...new Set(filtered.map(s => s.name))];
                uniqueNames.forEach(name => {
                    sel.innerHTML += `<option value="${name}">${name}</option>`;
                });
            }
            
            if (currentVal && filtered.some(s => s.name === currentVal)) {
                sel.value = currentVal;
            }
        });
    } catch (err) {
        console.error('Failed to populate subjects:', err);
    }
}

async function populateSharedDropdowns(prefix) {
  const classSel = document.getElementById(`${prefix}-classLevel`);
  const secSel = document.getElementById(`${prefix}-section`);
  const subSelId = `${prefix}-subject`;
  if (!classSel || !secSel) return;

  try {
    const res = await teacherAPI.getAttendanceClasses(teacherId || '');
    if (res.success && res.data && res.data.length > 0) {
      const parsed = res.data.map(raw => {
        if (typeof raw === 'object' && raw !== null) {
          return { classLevel: String(raw.class_level || ''), section: raw.section || null };
        }
        const value = String(raw || '').trim();
        const sectionMatch = value.match(/^(\d+)([A-Z])$/i);
        if (sectionMatch) return { classLevel: sectionMatch[1], section: sectionMatch[2].toUpperCase() };
        return { classLevel: value, section: null };
      });

      const classes = [...new Set(parsed.map(p => p.classLevel))].sort((a, b) => Number(a) - Number(b));
      const sectionsByClass = parsed.reduce((acc, item) => {
        if (!acc[item.classLevel]) acc[item.classLevel] = new Set();
        if (item.section) acc[item.classLevel].add(item.section);
        return acc;
      }, {});

      classSel.innerHTML = '<option value="">-- Select Class --</option>' +
        classes.map(c => `<option value="${c}">${c}</option>`).join('');

      const renderSectionsAndSubjects = async () => {
        const selectedClass = classSel.value;
        const selectedSection = secSel.value;
        
        if (!selectedClass) {
          secSel.innerHTML = '<option value="">-- Select Section (Optional) --</option>';
          populateSubjectDropdown('', '', subSelId);
          return;
        }

        let sections = sectionsByClass[selectedClass] ? [...sectionsByClass[selectedClass]].sort() : [];
        
        // If no sections found locally (e.g. assigned to 'ALL'), fetch from API
        if (sections.length === 0) {
          try {
            const secRes = await teacherAPI.getSectionsByClass(selectedClass);
            sections = secRes.data || [];
          } catch (err) {
            console.error('Failed to fetch sections for HW modal:', err);
          }
        }

        secSel.innerHTML = '<option value="">-- Select Section (Optional) --</option>' +
          sections.map(s => `<option value="${s}">${s}</option>`).join('');
          
        if (selectedSection) secSel.value = selectedSection;
        
        // Update subjects
        populateSubjectDropdown(selectedClass, secSel.value, subSelId);
      };

      classSel.onchange = renderSectionsAndSubjects;
      secSel.onchange = () => populateSubjectDropdown(classSel.value, secSel.value, subSelId);
      
      await renderSectionsAndSubjects();
    } else {
      classSel.innerHTML = '<option value="">-- Select Class --</option>';
      secSel.innerHTML = '<option value="">-- Select Section (Optional) --</option>';
    }
  } catch (err) {
    console.error('Error populating dropdowns:', err);
  }
}

function init() {
  hideProtectionScreen();
  syncToSessionStorage('teacher');
  teacherId = getUserId();

  if (!teacherId || teacherId === 'null') {
    window.location.href = './index.html';
    return;
  }

  teacherPhone = sessionStorage.getItem('teacherPhone');

  const profileBtn = document.getElementById('teacher-profile-btn');
  const profileMenu = document.getElementById('teacher-profile-dropdown');

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
      profileBtn.setAttribute('aria-expanded', !isExpanded);
      profileMenu.classList.toggle('open');
    });
  }

  const dropLogoutBtn = document.getElementById('dropdown-logout-btn-teacher');
  if (dropLogoutBtn) {
    dropLogoutBtn.addEventListener('click', window.handleLogout);
  }

  const initialEl = document.getElementById('teacher-avatar-initial');
  const tName = getUserName() || 'Teacher';
  if (initialEl) initialEl.textContent = tName.charAt(0).toUpperCase();

  const ddName = document.getElementById('dropdown-teacher-name');
  if (ddName) ddName.textContent = tName;

  const ddEmail = document.getElementById('dropdown-teacher-email');
  if (ddEmail) ddEmail.textContent = teacherPhone || `teacher@a2z.local`;

  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
    document.querySelectorAll('.sidebar nav a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('active');
        }
      });
    });
  }

  setupTabs();
  setupFormListeners();
  loadDashboard();

  document.addEventListener('click', (e) => {
    // Close profile menu
    if (profileBtn && profileMenu) {
      if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
        profileBtn.setAttribute('aria-expanded', 'false');
        profileMenu.classList.remove('open');
      }
    }

    // Close action menus only if clicking outside
    if (!e.target.closest('.action-menu') && !e.target.closest('.action-menu-dropdown')) {
      document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
      if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    showInfo('Loading dashboard...');
    const [dashRes, matRes] = await Promise.all([
      teacherAPI.getDashboard(teacherId),
      teacherAPI.getMaterials(teacherId),
    ]);
    hideInfo();

    if (dashRes.success) {
      setText('stat-students', dashRes.stats?.totalStudents ?? '–');
      setText('stat-homework', dashRes.homework?.length ?? 0);
      allTimetable = dashRes.timetable || [];
      allHomework = dashRes.homework || [];

      // Update Profile Information
      const teacher = dashRes.teacher;
      if (teacher) {
        const ddName = document.getElementById('dropdown-teacher-name');
        if (ddName) ddName.textContent = teacher.name || getUserName() || 'Teacher';
        
        const ddId = document.getElementById('dropdown-teacher-id');
        if (ddId) ddId.textContent = `ID: ${teacher.teacherId || 'N/A'}`;
        
        const ddEmail = document.getElementById('dropdown-teacher-email');
        if (ddEmail) ddEmail.textContent = teacher.email || 'No email';
        
        const ddPhone = document.getElementById('dropdown-teacher-phone');
        if (ddPhone) ddPhone.textContent = `+91 ${teacher.phone || 'N/A'}`;

        const initialEl = document.getElementById('teacher-avatar-initial');
        if (initialEl && teacher.name) initialEl.textContent = teacher.name.charAt(0).toUpperCase();
      }

      // Update Assigned Classes in Dropdown
      const classListEl = document.getElementById('dropdown-teacher-classes');
      if (classListEl && dashRes.classes) {
        if (dashRes.classes.length === 0) {
          classListEl.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">None assigned</span>';
        } else {
          classListEl.innerHTML = dashRes.classes.map(c => 
            `<span class="status-badge" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(0, 82, 204, 0.1); color: var(--accent-blue);">Class ${c.classLevel}</span>`
          ).join('');
        }
      }
    }

    if (matRes.success) {
      allMaterials = matRes.data || [];
      setText('stat-materials', allMaterials.length);
    }

    renderTodayTimetable();
  } catch (err) {
    hideInfo();
    console.error('Dashboard load error:', err);
    showError('Failed to load dashboard: ' + err.message);
  }
}

function renderTodayTimetable() {
  const today = todayName();
  const label = document.getElementById('today-label');
  if (label) label.textContent = `— ${today}`;
  const tbody = document.getElementById('today-timetable-body');
  if (!tbody) return;

  const todayEntries = allTimetable.filter(e => {
    const normalized = normalizeDayName(e.dayOfWeek);
    return normalized === today;
  });

  const now = nowMinutes();
  const upcomingEntries = todayEntries.filter(e => {
    const end = timeToMinutes(e.endTime);
    return now < end;
  });

  if (!upcomingEntries.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">No upcoming classes today</td></tr>`;
    return;
  }

  tbody.innerHTML = upcomingEntries
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    .map(e => {
      const start = timeToMinutes(e.startTime);
      const end = timeToMinutes(e.endTime);
      const isNow = now >= start && now < end;
      const statusClass = isNow ? 'status-active' : 'status-pending';
      const statusText = isNow ? 'In Session' : 'Upcoming';

      return `
      <tr class="timetable-card ${isNow ? 'timetable-now' : ''}">
        <td><strong>${e.classLevel || '–'}</strong></td>
        <td>
            ${e.subject || '–'}
            ${isNow ? '<span class="status-badge status-active" style="margin-left:8px; font-size:0.65rem;">NOW</span>' : ''}
        </td>
        <td><i class="far fa-clock"></i> ${formatTime(e.startTime)} – ${formatTime(e.endTime)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      </tr>`;
    }).join('');
}

setInterval(() => {
  if (allTimetable.length) renderTodayTimetable();
}, 60000);

function renderWeeklyTimetable() {
  const container = document.getElementById('weekly-timetable');
  if (!container) return;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = todayName();
  let selectedDay = today;

  const renderContent = () => {
    const grouped = {};
    days.forEach(d => { grouped[d] = []; });
    allTimetable.forEach(e => {
      const normalized = normalizeDayName(e.dayOfWeek);
      if (grouped[normalized]) grouped[normalized].push(e);
    });

    const dayButtonsHtml = days.map(day => `
      <button class="day-btn ${day === selectedDay ? 'active' : ''}" data-day="${day}" style="
        padding: 8px 16px;
        border: none;
        background: ${day === selectedDay ? '#0052cc' : '#ffffff'};
        color: ${day === selectedDay ? '#ffffff' : '#666'};
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        margin-right: 8px;
        transition: all 0.2s ease;
      ">${day.substring(0, 3)}</button>
    `).join('');

    const dayEntries = grouped[selectedDay] || [];
    const classesByLevel = {};
    dayEntries.forEach(e => {
      if (!classesByLevel[e.classLevel]) classesByLevel[e.classLevel] = [];
      classesByLevel[e.classLevel].push(e);
    });

    const sortedClasses = Object.keys(classesByLevel).sort((a, b) => parseInt(a) - parseInt(b));

    const classesHtml = sortedClasses.map(classLevel => {
      const entries = classesByLevel[classLevel].sort((a, b) =>
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );

      return `
        <div style="flex: 1; min-width: 350px; margin-bottom: 2rem;">
          <div style="background: #0052cc; color: white; padding: 12px 16px; border-radius: 6px; font-weight: 500; margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-book"></i> Class ${classLevel}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <th style="padding: 10px 12px; text-align: left; font-size: 0.85rem; color: #666; font-weight: 500;">TIME</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 0.85rem; color: #666; font-weight: 500;">SUBJECT</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 0.85rem; color: #666; font-weight: 500;">TEACHER</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 12px; color: #0052cc; font-weight: 500; font-size: 0.9rem;">${formatTime(e.startTime)}</td>
                  <td style="padding: 12px; color: #1a1a1a; font-size: 0.9rem;">${e.subject || '–'}</td>
                  <td style="padding: 12px; color: #666; font-size: 0.9rem;">${e.teacherPhone ? 'Primary' : 'Secondary'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }).join('');

    const noDataHtml = sortedClasses.length === 0 ? `<p style="color:var(--text-muted); padding: 2rem; text-align: center;">No classes scheduled for ${selectedDay}</p>` : '';

    container.innerHTML = `
      <div style="margin-bottom: 2rem;"><div style="display: flex; gap: 8px; flex-wrap: wrap;">${dayButtonsHtml}</div></div>
      <div style="display: flex; gap: 2rem; flex-wrap: wrap;">${classesHtml || noDataHtml}</div>`;

    container.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDay = btn.getAttribute('data-day');
        renderContent();
      });
    });
  };

  renderContent();
}

// ─── ATTENDANCE SUB-TAB SWITCHING ──────────────────────────────────────────
window.switchAttendanceSubTab = function(subtab) {
    // Update button states
    document.querySelectorAll('.att-subtab').forEach(btn => {
        if (btn.dataset.subtab === subtab) {
            btn.classList.add('active');
            btn.style.color = 'var(--text-main)';
            btn.style.borderBottom = '3px solid var(--accent-blue)';
        } else {
            btn.classList.remove('active');
            btn.style.color = 'var(--text-muted)';
            btn.style.borderBottom = '3px solid transparent';
        }
    });

    // Toggle content sections
    const markSection = document.getElementById('att-subtab-mark');
    const reportSection = document.getElementById('att-subtab-report');
    
    if (subtab === 'mark') {
        if (markSection) markSection.style.display = 'block';
        if (reportSection) reportSection.style.display = 'none';
    } else {
        if (markSection) markSection.style.display = 'none';
        if (reportSection) reportSection.style.display = 'block';
        initSummaryTab(); // Re-init summary if needed
    }
};

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
async function initAttendanceTab() {
  const sel = document.getElementById('att-class-select');
  if (!sel || sel.options.length > 1) return;
  try {
    const res = await teacherAPI.getAttendanceClasses(teacherId);
    availableClasses = res.data || [];
    sel.innerHTML = '<option value="">-- Select Class --</option>' +
      availableClasses.map(c => {
        const val = c.class_level || c;
        return `<option value="${val}">${val}</option>`;
      }).join('');

    const attDate = document.getElementById('att-date');
    if (attDate && !attDate.value) attDate.value = new Date().toISOString().split('T')[0];
  } catch (err) {
    showError('Failed to load classes: ' + err.message);
  }
}

let attendanceData = {}; 

window.onAttClassChange = async function () {
  const classLevel = document.getElementById('att-class-select').value;
  const sectionGroup = document.getElementById('att-section-group');
  const sectionSel = document.getElementById('att-section-select');
  if (!sectionGroup || !sectionSel) return;

  if (!classLevel) {
    sectionGroup.style.display = 'none';
    sectionSel.innerHTML = '<option value="">-- Choose Section --</option>';
    return;
  }

  try {
    const res = await teacherAPI.getSectionsByClass(classLevel);
    const sections = res.data || [];
    
    if (sections.length === 0) {
      sectionGroup.style.display = 'none';
      sectionSel.innerHTML = '<option value="">-- Choose Section --</option>';
    } else {
      sectionGroup.style.display = 'block';
      sectionSel.innerHTML = '<option value="">-- All Sections --</option>';
      sections.forEach(s => sectionSel.innerHTML += `<option value="${s}">${s}</option>`);
    }
  } catch (err) {
    console.error('Error fetching sections:', err);
  }
};

window.loadAttendanceSheet = async function () {
    const classLevel = document.getElementById('att-class-select').value;
    const date = document.getElementById('att-date').value;
    if (!classLevel || !date) { showError('Please select a class and date.'); return; }

    try {
        const section = document.getElementById('att-section-select')?.value || '';
        showInfo('Loading students...');
        const res = await teacherAPI.getAttendanceSheet(teacherId, classLevel, date, section);
        hideInfo();

        const container = document.getElementById('att-sheet-container');
        const list = document.getElementById('att-list-container');
        if (!container || !list) return;
        
        const students = res.students || [];
        const existingMap = res.existing || {};

        if (!students.length) {
            container.style.display = 'block';
            list.innerHTML = renderEmptyState(1, 'No students found in this class.');
            return;
        }

        attendanceData = {};
        list.innerHTML = "";
        const totalCountEl = document.getElementById('att-total-count');
        if (totalCountEl) totalCountEl.textContent = students.length;

        students.forEach(s => {
            const currentStatus = existingMap[s.id] || null;
            attendanceData[s.id] = currentStatus;

            const card = document.createElement('div');
            card.className = 'att-student-card';
            card.innerHTML = `
                <div class="att-student-info">
                    <div>
                        <div class="att-student-name">${s.name}</div>
                        <div class="att-student-roll">ID: #${s.id}</div>
                    </div>
                </div>
                <div class="att-toggles">
                    <button class="att-toggle-btn ${currentStatus === 'present' ? 'active' : ''}" data-id="${s.id}" data-status="present">P</button>
                    <button class="att-toggle-btn ${currentStatus === 'absent' ? 'active' : ''}" data-id="${s.id}" data-status="absent">A</button>
                    <button class="att-toggle-btn ${currentStatus === 'late' ? 'active' : ''}" data-id="${s.id}" data-status="late">L</button>
                </div>`;

            const buttons = card.querySelectorAll('.att-toggle-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    attendanceData[s.id] = btn.dataset.status;
                    updateAttStats();
                });
            });
            list.appendChild(card);
        });

        container.style.display = 'block';
        updateAttStats();

        const markAllBtn = document.getElementById('btn-mark-all-present');
        if (markAllBtn) {
            markAllBtn.onclick = () => {
                document.querySelectorAll('.att-toggle-btn[data-status="present"]').forEach(btn => {
                    if (!btn.classList.contains('active')) btn.click();
                });
            };
        }
    } catch (err) {
        hideInfo();
        showError('Failed to load attendance: ' + err.message);
    }
};

function updateAttStats() {
    let p = 0, a = 0;
    Object.values(attendanceData).forEach(status => {
        if (status === 'present' || status === 'late') p++;
        if (status === 'absent') a++;
    });
    const pEl = document.getElementById('att-present-count');
    const aEl = document.getElementById('att-absent-count');
    if (pEl) pEl.textContent = p;
    if (aEl) aEl.textContent = a;
}

window.saveAttendance = async function () {
    const classLevel = document.getElementById('att-class-select').value;
    const date = document.getElementById('att-date').value;
    
    const pendingCount = Object.values(attendanceData).filter(v => v === null).length;
    if (pendingCount > 0) {
        showError(`Please mark attendance for all students (${pendingCount} remaining).`);
        return;
    }

    const section = document.getElementById('att-section-select')?.value || 'A';
    const records = Object.entries(attendanceData).map(([id, status]) => ({
        studentId: parseInt(id),
        classLevel,
        section,
        date,
        status
    }));

    if (!records.length) { showError('No students to save.'); return; }

    try {
        showInfo('Saving attendance...');
        await teacherAPI.markBulkAttendance(teacherId, records);
        hideInfo();
        showSuccess(`Successfully saved attendance for ${records.length} students.`);
    } catch (err) {
        hideInfo();
        showError('Failed to save attendance: ' + err.message);
    }
};

// ─── HOMEWORK ─────────────────────────────────────────────────────────────────
async function loadHomework() {
  try {
    const res = await teacherAPI.getHomework(teacherId);
    allHomework = res.data || [];
    renderHomeworkTable();
    renderDppTable();
  } catch (err) {
    showError('Failed to load homework: ' + err.message);
  }
}

function renderHomeworkTable() {
  const tbody = document.getElementById('hw-table-body');
  if (!tbody) return;
  const onlyHws = allHomework.filter(h => h.type === 'homework');
  if (!onlyHws.length) {
    tbody.innerHTML = renderEmptyState(5, 'No homework yet. Add one!');
    return;
  }
  
  tbody.innerHTML = onlyHws.map(hw => {
    const due = formatDate(hw.dueDate);
    const classLevel = hw.classLevel || '-';
    const section = hw.section || '-';
    const assignedByName = hw.assignedByName || 'Teacher';
    
    return `<tr>
      <td><strong>${hw.title}</strong></td>
      <td><span class="status-badge status-active">${classLevel}</span></td>
      <td><span class="status-badge" style="background-color: #e0e7ff; color: #4f46e5;">${section}</span></td>
      <td>${hw.subject}</td>
      <td>${due}</td>
      <td style="text-align: right;">
        <div class="action-menu">
          <button class="action-menu-btn" onclick="toggleActionMenu(this)">⋮</button>
          <div class="action-menu-dropdown" onclick="event.stopPropagation()">
            <button class="action-menu-item" onclick="editHomework(${hw.id}); event.stopPropagation();"><i class="fas fa-pen" style="width:16px;"></i> Edit</button>
            <div class="action-menu-divider"></div>
            <button class="action-menu-item danger" onclick="deleteHomework(${hw.id}); event.stopPropagation();"><i class="fas fa-trash" style="width:16px;"></i> Delete</button>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderDppTable() {
  const tbody = document.getElementById('dpp-table-body');
  if (!tbody) return;
  const onlyDpps = allHomework.filter(h => h.type === 'daily_practice');
  if (!onlyDpps.length) {
    tbody.innerHTML = renderEmptyState(5, 'No practice sheets yet.');
    return;
  }
  
  tbody.innerHTML = onlyDpps.map(hw => {
    const posted = formatDate(hw.createdAt);
    const classLevel = hw.classLevel || '-';
    const section = hw.section || '-';
    
    return `<tr>
      <td><strong>${hw.title}</strong></td>
      <td><span class="status-badge status-active">${classLevel}</span></td>
      <td><span class="status-badge" style="background-color: #e0e7ff; color: #4f46e5;">${section}</span></td>
      <td>${hw.subject}</td>
      <td>${posted}</td>
      <td style="text-align: right;">
        <div class="action-menu">
          <button class="action-menu-btn" onclick="toggleActionMenu(this)">⋮</button>
          <div class="action-menu-dropdown" onclick="event.stopPropagation()">
            <button class="action-menu-item" onclick="editHomework(${hw.id}); event.stopPropagation();"><i class="fas fa-pen" style="width:16px;"></i> Edit</button>
            <div class="action-menu-divider"></div>
            <button class="action-menu-item danger" onclick="deleteHomework(${hw.id}); event.stopPropagation();"><i class="fas fa-trash" style="width:16px;"></i> Delete</button>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.openHwModal = async function (typeOrHw = 'homework') {
  await populateSharedDropdowns('hw');
  const form = document.getElementById('hw-form');
  if (form) form.reset();
  const hw = typeof typeOrHw === 'object' ? typeOrHw : null;
  const type = typeof typeOrHw === 'string' ? typeOrHw : (hw ? hw.type : 'homework');
  const isDpp = type === 'daily_practice';

  const editId = document.getElementById('hw-edit-id');
  if (editId) editId.value = hw?.id || '';
  
  const titleEl = document.getElementById('hw-modal-title');
  if (titleEl) titleEl.textContent = hw ? `Edit ${isDpp ? 'Practice' : 'Homework'}` : `Add ${isDpp ? 'Practice' : 'Homework'}`;
  
  const typeEl = document.getElementById('hw-type');
  if (typeEl) typeEl.value = type;

  const dueDateInput = document.getElementById('hw-dueDate');

  if (hw) {
    document.getElementById('hw-classLevel').value = hw.classLevel || '';
    document.getElementById('hw-section').value = hw.section || '';
    document.getElementById('hw-subject').value = hw.subject || '';
    document.getElementById('hw-title').value = hw.title || '';
    document.getElementById('hw-description').value = hw.description || '';
  }

  if (dueDateInput) {
    dueDateInput.required = !isDpp;
    if (isDpp) {
      dueDateInput.value = '';
    } else if (hw) {
      dueDateInput.value = hw.dueDate ? hw.dueDate.split('T')[0] : '';
    }
  }

  const modal = document.getElementById('hw-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }

  const dueDateContainer = document.getElementById('hw-dueDate-container');
  if (dueDateContainer) {
    dueDateContainer.style.display = isDpp ? 'none' : 'block';
  }
};

window.closeHwModal = function () {
  const modal = document.getElementById('hw-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }
};

window.editHomework = function (id) {
  const hw = allHomework.find(h => h.id === id);
  if (hw) openHwModal(hw);
};

window.deleteHomework = async function (id) {
  if (!confirm('Delete this homework?')) return;
  try {
    await teacherAPI.deleteHomework(id, parseInt(teacherId));
    showSuccess('Homework deleted.');
    await loadHomework();
  } catch (err) { showError(err.message); }
};

function setupFormListeners() {
  document.getElementById('hw-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('hw-edit-id').value;
    const fd = new FormData();
    fd.append('teacherId', teacherId);
    fd.append('classLevel', document.getElementById('hw-classLevel').value);
    fd.append('section', document.getElementById('hw-section').value);
    fd.append('subject', document.getElementById('hw-subject').value);
    fd.append('type', document.getElementById('hw-type')?.value || 'homework');
    fd.append('title', document.getElementById('hw-title').value);
    fd.append('description', document.getElementById('hw-description').value);
    fd.append('dueDate', document.getElementById('hw-dueDate').value);
    const file = document.getElementById('hw-file').files[0];
    if (file) fd.append('attachment', file);

    try {
      showInfo(id ? 'Updating homework...' : 'Adding homework...');
      if (id) await teacherAPI.updateHomework(id, fd);
      else await teacherAPI.createHomework(fd);
      hideInfo();
      showSuccess(id ? 'Homework updated!' : 'Homework added!');
      closeHwModal();
      await loadHomework();
    } catch (err) { hideInfo(); showError(err.message); }
  });

  document.getElementById('material-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    
    const classLevel = document.getElementById('material-classLevel')?.value;
    const section = document.getElementById('material-section')?.value;
    const subject = document.getElementById('material-subject')?.value;
    const title = document.getElementById('material-title')?.value;
    const description = document.getElementById('material-description')?.value || '';
    const file = document.getElementById('material-file')?.files[0];
    const id = document.getElementById('material-edit-id')?.value;

    if (!classLevel || !title) {
      showError('Please fill in required fields: Class and Title.');
      return;
    }

    if (!id && !file) {
      showError('Please select a file to upload');
      return;
    }

    // File validation
    if (file) {
      const maxSize = 20 * 1024 * 1024; // 20MB
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      
      if (!allowedTypes.includes(file.type)) {
        showError(`Invalid file type. Only PDF, JPG, PNG allowed.`);
        return;
      }
      
      if (file.size > maxSize) {
        showError(`File too large. Max 20MB.`);
        return;
      }
    }

    const fd = new FormData();
    fd.append('teacherId', teacherId);
    fd.append('classLevel', classLevel);
    fd.append('section', section || '');
    if (subject) fd.append('subject', subject);
    fd.append('title', title);
    fd.append('description', description);
    
    if (id) {
      fd.append('currentFileUrl', document.getElementById('material-current-file').value);
    }
    
    if (file) {
      fd.append('materialFile', file);
    }

    try {
      showInfo(id ? 'Updating material...' : 'Adding material...');
      if (id) {
        await teacherAPI.updateMaterial(id, fd);
      } else {
        await teacherAPI.createMaterial(fd);
      }
      hideInfo();
      showSuccess(id ? 'Material updated successfully!' : 'Material added successfully!');
      closeMaterialModal();
      await loadMaterials();
    } catch (err) { 
      hideInfo(); 
      showError(err.message); 
    }
  });

  document.getElementById('syl-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      teacherId: parseInt(teacherId),
      classLevel: document.getElementById('syl-classLevel').value,
      section: document.getElementById('syl-section').value,
      subject: document.getElementById('syl-subject').value,
      chapter: document.getElementById('syl-chapter').value,
      description: document.getElementById('syl-description').value,
    };
    try {
      showInfo('Adding chapter...');
      await teacherAPI.createSyllabus(data);
      hideInfo();
      showSuccess('Chapter added!');
      closeSyllabusModal();
      await loadSyllabus();
    } catch (err) { hideInfo(); showError(err.message); }
  });
}

// ─── MATERIALS ────────────────────────────────────────────────────────────────
async function loadMaterials() {
  try {
    showAllMaterials = false;
    const res = await teacherAPI.getMaterials(teacherId);
    allMaterials = (res.data || []).map((m) => ({
      ...m,
      classLevel: m.classLevel || m.class_level || '-',
      section: m.section || '',
      subject: m.subject || 'General',
      fileUrl: m.fileUrl || m.file_url || '',
      uploadedBy: m.uploadedBy || m.uploaded_by || 'Admin',
      createdAt: m.createdAt || m.created_at || null,
    }));
    updateMaterialsStats();
    populateMaterialFilters();
    renderMaterialsTable();
  } catch (err) { 
    showError('Failed to load materials: ' + err.message); 
  }
}

function renderMaterialsTable() {
  const tbody = document.getElementById('mat-table-body');
  const toggleBtn = document.getElementById('mat-toggle-btn');
  const countText = document.getElementById('mat-count-text');
  if (!tbody) return;
  const list = getFilteredMaterials();
  if (!list.length) {
    tbody.innerHTML = renderEmptyState(7, 'No materials found.');
    if (toggleBtn) toggleBtn.style.display = 'none';
    if (countText) countText.textContent = '';
    return;
  }

  const displayLimit = 10;
  const toShow = showAllMaterials ? list : list.slice(0, displayLimit);

  tbody.innerHTML = toShow.map(m => `
    <tr>
      <td><strong>${m.title}</strong></td>
      <td>${m.subject}</td>
      <td><span class="badge" style="background:var(--bg-hover); color:var(--text-main); border:1px solid var(--border-subtle);">Class ${m.classLevel}</span></td>
      <td><span class="badge secondary">${m.section || '-'}</span></td>
      <td>${m.uploadedBy}</td>
      <td><small style="color: var(--text-muted);">${formatDate(m.createdAt)}</small></td>
      <td style="text-align: right;">
        <div class="action-menu">
          <button class="action-menu-btn" onclick="toggleActionMenu(event)">⋮</button>
          <div class="action-menu-dropdown">
            <button class="action-menu-item" onclick="downloadFile('${m.fileUrl}', '${(m.title || 'material').replace(/'/g, "\\'")}.pdf')"><i class="fas fa-download" style="width:16px;"></i> Download</button>
            <button class="action-menu-item" onclick="editMaterial(${m.id})"><i class="fas fa-pen" style="width:16px;"></i> Edit</button>
            <div class="action-menu-divider"></div>
            <button class="action-menu-item danger" onclick="deleteMaterial(${m.id})"><i class="fas fa-trash" style="width:16px;"></i> Delete</button>
          </div>
        </div>
      </td>
    </tr>`).join('');

  if (toggleBtn) {
    toggleBtn.style.display = list.length > displayLimit ? 'inline-flex' : 'none';
    toggleBtn.textContent = showAllMaterials ? 'Show Less' : `Show More Materials (${list.length})`;
  }
  if (countText) countText.textContent = showAllMaterials ? '' : `Showing ${toShow.length} of ${list.length}`;
}

window.openMaterialModal = async function (material = null) {
  await populateSharedDropdowns('material');
  const form = document.getElementById('material-form');
  if (form) form.reset();

  const classDropdown = document.getElementById('material-classLevel');
  const sectionDropdown = document.getElementById('material-section');

  const editId = document.getElementById('material-edit-id');
  const titleEl = document.getElementById('material-modal-title');
  const submitBtn = document.getElementById('material-submit-btn');
  const currentFileEl = document.getElementById('material-current-file');
  const fileHint = document.getElementById('material-file-hint');
  const fileLabel = document.getElementById('material-file-label');
  const fileInput = document.getElementById('material-file');

  if (material) {
    if (editId) editId.value = material.id;
    if (titleEl) titleEl.textContent = 'Edit Study Material';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (currentFileEl) currentFileEl.value = material.fileUrl || '';
    if (fileHint) fileHint.style.display = 'block';
    if (fileLabel) fileLabel.textContent = 'Change Resource File (Optional)';
    if (fileInput) fileInput.required = false;

    // Fill other fields
    if (classDropdown) classDropdown.value = material.classLevel || '';
    document.getElementById('material-section').value = material.section || '';
    document.getElementById('material-subject').value = material.subject || '';
    document.getElementById('material-title').value = material.title || '';
    document.getElementById('material-description').value = material.description || '';
  } else {
    if (editId) editId.value = '';
    if (titleEl) titleEl.textContent = 'Add Study Material';
    if (submitBtn) submitBtn.textContent = 'Add Material';
    if (currentFileEl) currentFileEl.value = '';
    if (fileHint) fileHint.style.display = 'none';
    if (fileLabel) fileLabel.textContent = 'Resource File (PDF/Image) *';
    if (fileInput) fileInput.required = true;
  }

  const modal = document.getElementById('material-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
};

window.closeMaterialModal = function () {
  const modal = document.getElementById('material-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }
};

window.editMaterial = function (id) {
  const material = allMaterials.find(m => m.id === id);
  if (material) openMaterialModal(material);
};

window.deleteMaterial = async function (id) {
  if (!confirm('Are you sure you want to delete this study material?')) return;
  try {
    showInfo('Deleting material...');
    await teacherAPI.deleteMaterial(id, teacherId);
    hideInfo();
    showSuccess('Material deleted successfully.');
    await loadMaterials();
  } catch (err) {
    hideInfo();
    showError(err.message);
  }
};

function updateMaterialsStats() {
  const total = allMaterials.length;
  const classCount = new Set(allMaterials.map(m => m.classLevel)).size;
  const subjectCount = new Set(allMaterials.map(m => m.subject || 'General')).size;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekCount = allMaterials.filter(m => m.createdAt && new Date(m.createdAt) >= weekAgo).length;

  setText('mat-stat-total', total);
  setText('mat-stat-classes', classCount);
  setText('mat-stat-subjects', subjectCount);
  setText('mat-stat-week', weekCount);
}

function populateMaterialFilters() {
  const classFilter = document.getElementById('mat-class-filter');
  const sectionFilter = document.getElementById('mat-section-filter');
  if (!classFilter || !sectionFilter) return;

  const classes = [...new Set(allMaterials.map(m => m.classLevel).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  classFilter.innerHTML = '<option value="">All Classes</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');

  const sections = [...new Set(allMaterials.map(m => m.section).filter(Boolean))].sort();
  sectionFilter.innerHTML = '<option value="">All Sections</option>' + sections.map(s => `<option value="${s}">${s}</option>`).join('');
}

function getFilteredMaterials() {
  const search = (document.getElementById('mat-search')?.value || '').toLowerCase();
  const classFilter = document.getElementById('mat-class-filter')?.value || '';
  const sectionFilter = document.getElementById('mat-section-filter')?.value || '';

  return allMaterials.filter((m) => {
    const matchesSearch = !search ||
      (m.title || '').toLowerCase().includes(search) ||
      (m.subject || '').toLowerCase().includes(search) ||
      (m.description || '').toLowerCase().includes(search);
    const matchesClass = !classFilter || m.classLevel === classFilter;
    const matchesSection = !sectionFilter || m.section === sectionFilter;
    return matchesSearch && matchesClass && matchesSection;
  });
}

window.filterTeacherMaterials = function () {
  showAllMaterials = false;
  renderMaterialsTable();
};

window.toggleShowAllTeacherMaterials = function () {
  showAllMaterials = !showAllMaterials;
  renderMaterialsTable();
};



// ─── SYLLABUS ─────────────────────────────────────────────────────────────────
async function loadSyllabus() {
  try {
    const res = await teacherAPI.getSyllabus(teacherId);
    allSyllabus = res.data || [];
    renderSyllabus();
  } catch (err) { showError('Failed to load syllabus: ' + err.message); }
}

function renderSyllabus() {
  const container = document.getElementById('syllabus-container');
  if (!container) return;
  if (!allSyllabus.length) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No chapters added yet. Click "Add Chapter" to begin.</p>';
    return;
  }

  const bySubject = {};
  allSyllabus.forEach(s => {
    const key = `${s.subject} — Class ${s.classLevel}${s.section ? ' (' + s.section + ')' : ''}`;
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(s);
  });

  const total = allSyllabus.length;
  const done = allSyllabus.filter(s => s.completed).length;
  const pct = total ? Math.round(done * 100 / total) : 0;

  container.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-muted); margin-bottom:4px;">
        <span>Overall Progress</span><span>${done}/${total} chapters</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    </div>
    ${Object.entries(bySubject).map(([subj, chapters]) => {
    const subjTotal = chapters.length;
    const subjDone = chapters.filter(c => c.completed).length;
    const subjPct = Math.round(subjDone * 100 / subjTotal);

    return `
      <div class="syllabus-subject-card">
        <div class="subject-header-row">
            <div class="subject-title"><i class="fas fa-book-open"></i> ${subj}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${subjPct}% Complete</div>
        </div>
        <div class="chapter-list">
            ${chapters.map(c => `
                <div class="chapter-item ${c.completed ? 'done' : ''}">
                    <div class="chapter-info">
                        <input type="checkbox" ${c.completed ? 'checked' : ''} onchange="toggleChapter(${c.id}, this.checked)" style="width:16px; height:16px; cursor:pointer;">
                        <div>
                            <div class="chapter-text">${c.chapter}</div>
                            ${c.description ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${c.description}</div>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="status-badge ${c.completed ? 'status-active' : 'status-pending'}" style="font-size: 0.7rem;">${c.completed ? 'Completed' : 'Planned'}</span>
                        <button class="btn-sm btn-delete" style="padding: 2px 6px;" onclick="deleteChapter(${c.id})"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
      </div>`;
  }).join('')}`;
}

async function setupSyllabusDropdowns() {
  await populateSharedDropdowns('syl');
}

window.openSyllabusModal = () => {
  const form = document.getElementById('syl-form');
  if (form) form.reset();
  const modal = document.getElementById('syl-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
    setupSyllabusDropdowns();
  }
};
window.closeSyllabusModal = () => {
  const modal = document.getElementById('syl-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }
};

window.toggleChapter = async function (id, completed) {
  try {
    await teacherAPI.updateSyllabus(id, { teacherId: parseInt(teacherId), completed });
    await loadSyllabus();
  } catch (err) { showError(err.message); }
};

window.deleteChapter = async function (id) {
  if (!confirm('Delete this chapter?')) return;
  try {
    await teacherAPI.deleteSyllabus(id, parseInt(teacherId));
    showSuccess('Chapter deleted.');
    await loadSyllabus();
  } catch (err) { showError(err.message); }
};

// ─── ATTENDANCE SUMMARY ───────────────────────────────────────────────────────
async function initSummaryTab() {
  const sel = document.getElementById('sum-class-select');
  if (!sel || sel.options.length > 1) return;
  try {
    const res = await teacherAPI.getAttendanceClasses(teacherId);
    const classes = res.data || [];
    sel.innerHTML = '<option value="">-- Select Class --</option>' +
      classes.map(c => {
        const val = c.class_level || c;
        return `<option value="${val}">${val}</option>`;
      }).join('');
    
    sel.onchange = onSumClassChange;
    
    const monthEl = document.getElementById('sum-month');
    if (monthEl && !monthEl.value) monthEl.value = new Date().toISOString().slice(0, 7);
  } catch { /* silent */ }
}

window.onSumClassChange = async function () {
  const classLevel = document.getElementById('sum-class-select').value;
  const sectionGroup = document.getElementById('sum-section-group');
  const sectionSel = document.getElementById('sum-section-select');
  if (!sectionGroup || !sectionSel) return;

  if (!classLevel) {
    sectionGroup.style.display = 'none';
    sectionSel.innerHTML = '<option value="">-- Choose Section --</option>';
    return;
  }

  try {
    const res = await teacherAPI.getSectionsByClass(classLevel);
    const sections = res.data || [];
    
    if (sections.length === 0) {
      sectionGroup.style.display = 'none';
      sectionSel.innerHTML = '<option value="">-- Choose Section --</option>';
    } else {
      sectionGroup.style.display = 'block';
      sectionSel.innerHTML = '<option value="">-- All Sections --</option>';
      sections.forEach(s => sectionSel.innerHTML += `<option value="${s}">${s}</option>`);
    }
  } catch (err) {
    console.error('Error fetching sections:', err);
  }
};

window.loadAttendanceSummary = async function () {
  const classLevel = document.getElementById('sum-class-select').value;
  const month = document.getElementById('sum-month').value;
  const section = document.getElementById('sum-section-select')?.value || '';
  
  if (!classLevel || !month) { showError('Select class and month.'); return; }

  try {
    showInfo('Loading summary...');
    const res = await teacherAPI.getAttendanceSummary(teacherId, classLevel, month, section);
    hideInfo();
    const data = res.data || [];
    const container = document.getElementById('summary-container');
    if (!container) return;

    if (!data.length) { container.innerHTML = '<p style="color:var(--text-muted);">No attendance data for this period.</p>'; return; }

    container.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Student Name</th><th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>Attendance %</th></tr></thead>
          <tbody>
            ${data.map(r => {
      const pct = r.attendancePercent || 0;
      const statusClass = pct >= 75 ? 'status-active' : pct >= 50 ? 'status-pending' : 'status-overdue';
      return `<tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.presentCount}</td>
                <td>${r.absentCount}</td>
                <td>${r.lateCount}</td>
                <td>${r.totalDays}</td>
                <td><span class="status-badge ${statusClass}">${Number(pct)}%</span></td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) { hideInfo(); showError('Failed: ' + err.message); }
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
function showSuccess(msg) { showAlert('success-alert', 'success-text', msg); }
function showError(msg) { showAlert('error-alert', 'error-text', msg); }
function showInfo(msg) { const el = document.getElementById('info-alert'); if (el) { const txt = document.getElementById('info-text'); if (txt) txt.textContent = msg; el.style.display = 'flex'; } }
function hideInfo() { const el = document.getElementById('info-alert'); if (el) el.style.display = 'none'; }
function showAlert(id, tid, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  const txt = document.getElementById(tid);
  if (txt) txt.textContent = msg;
  el.style.display = 'flex';
  setTimeout(() => el.style.display = 'none', 4000);
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function renderEmptyState(colspan, message, icon = 'fa-inbox') {
  return `<tr><td colspan="${colspan}" class="empty-state"><i class="fas ${icon}"></i><p>${message}</p></td></tr>`;
}



// ─── Dropdown Positioning & Logic ──────────────────────────────────────────
window.toggleActionMenu = function (e) {
  const btn = e.currentTarget || (e.target && e.target.closest('.action-menu-btn')) || (e instanceof HTMLElement ? e : null);
  if (!btn) return;
  
  // Find or create dropdown reference
  let dropdown = btn._dropdown;
  if (!dropdown) {
    dropdown = btn.nextElementSibling;
    if (dropdown && dropdown.classList.contains('action-menu-dropdown')) {
      btn._dropdown = dropdown;
    }
  }
  
  if (!dropdown) return;

  
  // Close all other menus
  document.querySelectorAll('.action-menu-dropdown.active').forEach(d => {
    if (d !== dropdown) d.classList.remove('active');
  });

  const isActive = dropdown.classList.contains('active');

  if (!isActive) {
    // Teleport to body to escape transform/overflow constraints
    if (dropdown.parentElement !== document.body) {
        document.body.appendChild(dropdown);
    }
    
    dropdown.classList.add('active');
    
    // Position logically
    const rect = btn.getBoundingClientRect();
    const dropdownHeight = dropdown.offsetHeight || 120;
    const dropdownWidth = dropdown.offsetWidth || 160;
    const viewportHeight = window.innerHeight;
    
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '9999999';
    
    // Vertical position (auto-flip)
    if (rect.bottom + dropdownHeight > viewportHeight - 10 && rect.top > dropdownHeight) {
      dropdown.style.top = (rect.top - dropdownHeight) + 'px';
      dropdown.classList.add('drop-up');
    } else {
      dropdown.style.top = rect.bottom + 'px';
      dropdown.classList.remove('drop-up');
    }
    
    // Horizontal position (align right to button)
    dropdown.style.left = (rect.right - dropdownWidth) + 'px';
    
    // Handle click outside to close
    const closeMenu = (event) => {
        if (!dropdown.contains(event.target) && event.target !== btn) {
            dropdown.classList.remove('active');
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  } else {
    dropdown.classList.remove('active');
  }
};

// ─── EXAM RESULTS ─────────────────────────────────────────────────────────────
let examStudents = [];

async function initExamTab() {
  const sel = document.getElementById('exam-class-select');
  if (!sel) return;
  if (sel.options.length > 1) { loadExamResults(); return; }
  
  try {
    const res = await teacherAPI.getAttendanceClasses(teacherId);
    const rawData = res.data || [];
    
    // Normalize and unique classes
    const classes = [...new Set(rawData.map(c => {
      if (typeof c === 'object' && c !== null) return String(c.class_level || '');
      const value = String(c || '').trim();
      const match = value.match(/^(\d+)/);
      return match ? match[1] : value;
    }))].filter(Boolean).sort((a, b) => Number(a) - Number(b));

    sel.innerHTML = '<option value="">Select Class</option>' +
      classes.map(c => `<option value="${c}">${c}</option>`).join('');
    
    document.getElementById('exam-add-subject-btn')?.addEventListener('click', createExamSubjectRow);
    document.getElementById('exam-submit-btn')?.addEventListener('click', submitExamResult);
    
    const container = document.getElementById('exam-subjects-container');
    if (container && container.children.length === 0) createExamSubjectRow();
    
    loadExamResults();
  } catch (err) {
    showError('Failed to load exam classes: ' + err.message);
  }
}

window.onExamClassChange = async function() {
    const classLevel = document.getElementById('exam-class-select').value;
    const sectionSel = document.getElementById('exam-section-select');
    const rollSelect = document.getElementById('exam-roll-select');
    const nameInput = document.getElementById('exam-name-input');
    
    if (rollSelect) rollSelect.innerHTML = '<option value="">Select Roll No.</option>';
    if (nameInput) nameInput.value = '';
    examStudents = [];

    // Update all subject dropdowns
    updateAllExamSubjectDropdowns();

    if (!classLevel) {
        if (sectionSel) sectionSel.innerHTML = '<option value="">Select Section</option>';
        return;
    }

    try {
        // Load sections for this class
        const secRes = await teacherAPI.getSectionsByClass(classLevel);
        const sections = secRes.data || [];
        if (sectionSel) {
            sectionSel.innerHTML = sections.map(s => `<option value="${s}">${s}</option>`).join('');
            if (sections.length === 0) {
                sectionSel.innerHTML = '<option value="">N/A</option>';
            }
        }
        
        // Trigger student load for the first/selected section
        onExamSectionChange();
    } catch (err) {
        console.error('Error fetching sections:', err);
        onExamSectionChange(); // Fallback to current section
    }
};

async function updateAllExamSubjectDropdowns() {
    const classLevel = document.getElementById('exam-class-select').value;
    const section = document.getElementById('exam-section-select').value;
    const selects = document.querySelectorAll('.sub-name');
    if (selects.length > 0) {
        populateSubjectDropdown(classLevel, section, Array.from(selects));
    }
}

window.onExamSectionChange = async function() {
    const classLevel = document.getElementById('exam-class-select').value;
    const section = document.getElementById('exam-section-select').value;
    const rollSelect = document.getElementById('exam-roll-select');
    const nameInput = document.getElementById('exam-name-input');
    
    // Update all subject dropdowns
    updateAllExamSubjectDropdowns();

    if (!classLevel) return;

    try {
        showInfo('Loading students...');
        const date = new Date().toISOString().split('T')[0];
        const res = await teacherAPI.getAttendanceSheet(teacherId, classLevel, date, section);
        hideInfo();
        
        examStudents = res.students || [];
        if (rollSelect) {
            rollSelect.innerHTML = '<option value="">Select Roll No.</option>' +
                examStudents.map(s => `<option value="${s.id}">${s.rollNumber || 'ID:'+s.id}</option>`).join('');
        }
        if (examStudents.length === 0) {
            showInfo('No students found for this class/section');
        }
    } catch (err) {
        hideInfo();
        showError('Failed to fetch students: ' + err.message);
    }
};

window.onExamRollChange = function() {
    const studentId = document.getElementById('exam-roll-select').value;
    const nameInput = document.getElementById('exam-name-input');
    if (!nameInput) return;
    const student = examStudents.find(s => String(s.id) === studentId);
    nameInput.value = student ? student.name : '';
};

function createExamSubjectRow() {
    const container = document.getElementById('exam-subjects-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'subject-row-entry card';
    row.style.cssText = 'padding: 1.5rem; margin-bottom: 1rem; border: 1px dashed var(--border-subtle); background: var(--bg-primary);';
    
    row.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 1rem; align-items: end;">
            <div class="filter-group">
                <label>Subject Name</label>
                <select class="sub-name" required>
                    <option value="">-- Select Class --</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Total</label>
                <input type="number" class="sub-total" value="100" min="1" oninput="calculateExamTotals()">
            </div>
            <div class="filter-group">
                <label>Obtained</label>
                <input type="number" class="sub-obtained" placeholder="0" min="0" oninput="calculateExamTotals()">
            </div>
            <div class="filter-group">
                <label>Grade</label>
                <input type="text" class="sub-grade" placeholder="-" readonly style="background: var(--bg-hover) !important;">
            </div>
            <button type="button" class="btn btn-danger remove-sub-btn" style="padding: 0.6rem; border-radius: 4px;">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;

    row.querySelector('.remove-sub-btn').addEventListener('click', () => {
        if (container.children.length > 1) { row.remove(); calculateExamTotals(); }
        else { showError("At least one subject is required."); }
    });
    container.appendChild(row);

    // Initial subject population for this new row
    const classLevel = document.getElementById('exam-class-select').value;
    const section = document.getElementById('exam-section-select').value;
    if (classLevel) {
        populateSubjectDropdown(classLevel, section, row.querySelector('.sub-name'));
    }
}

window.calculateExamTotals = function() {
    const rows = document.querySelectorAll('.subject-row-entry');
    let tSum = 0, oSum = 0;
    rows.forEach(row => {
        const t = parseFloat(row.querySelector('.sub-total').value || 0);
        const o = parseFloat(row.querySelector('.sub-obtained').value || 0);
        tSum += t; oSum += o;
        const gradeInput = row.querySelector('.sub-grade');
        if (t > 0) {
            const perc = (o / t) * 100;
            let grade = 'F';
            if (perc >= 90) grade = 'A+';
            else if (perc >= 80) grade = 'A';
            else if (perc >= 70) grade = 'B+';
            else if (perc >= 60) grade = 'B';
            else if (perc >= 50) grade = 'C+';
            else if (perc >= 40) grade = 'C';
            else if (perc >= 33) grade = 'D';
            gradeInput.value = grade;
            gradeInput.style.color = (grade === 'F') ? 'var(--danger)' : (grade.startsWith('A') ? 'var(--success)' : 'var(--accent-blue)');
        } else { gradeInput.value = '-'; }
    });
    const submitBtn = document.getElementById('exam-submit-btn');
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> Submit Marks (${oSum} / ${tSum})`;
}

async function submitExamResult() {
    const classLevel = document.getElementById('exam-class-select').value;
    const section = document.getElementById('exam-section-select').value;
    const studentId = document.getElementById('exam-roll-select').value;
    const student = examStudents.find(s => String(s.id) === studentId);
    const rollNumber = student ? student.rollNumber : '';
    const studentName = document.getElementById('exam-name-input').value;
    const examTitle = document.getElementById('exam-title-input').value;

    if (!classLevel || !studentId || !studentName || !examTitle) { showError("Please fill all student details and exam title."); return; }

    const rows = document.querySelectorAll('.subject-row-entry');
    const subjects = [];
    let totalMarks = 0, obtainedMarks = 0;

    for (const row of rows) {
        const name = row.querySelector('.sub-name').value.trim();
        const total = parseFloat(row.querySelector('.sub-total').value);
        const obtained = parseFloat(row.querySelector('.sub-obtained').value);
        const grade = row.querySelector('.sub-grade').value.trim();
        if (!name) { showError("Subject name is required for all rows."); return; }
        subjects.push({ name, total, obtained, grade });
        totalMarks += total; obtainedMarks += obtained;
    }

    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const remarks = percentage >= 33 ? 'Pass' : 'Fail';

    try {
        showInfo('Submitting results...');
        await teacherAPI.createExamResult({ 
            classLevel, 
            section, 
            studentId,
            rollNumber, 
            studentName, 
            examTitle, 
            subjects, 
            totalMarks, 
            obtainedMarks, 
            percentage: parseFloat(percentage.toFixed(2)), 
            remarks 
        });
        hideInfo();
        showSuccess("Exam result submitted successfully!");
        document.getElementById('exam-roll-select').value = '';
        document.getElementById('exam-name-input').value = '';
        const container = document.getElementById('exam-subjects-container');
        if (container) container.innerHTML = '';
        createExamSubjectRow();
        loadExamResults();
    } catch (err) { hideInfo(); showError("Failed to submit results: " + err.message); }
}

async function loadExamResults() {
    try {
        const res = await teacherAPI.getExamResults();
        renderExamResults(res.data || []);
    } catch (err) { console.error("Failed to load exam results", err); }
}

function renderExamResults(results) {
    const tbody = document.getElementById('exam-table-body');
    if (!tbody) return;
    if (!results.length) { tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No exam results recorded yet.</td></tr>`; return; }

    tbody.innerHTML = results.map((r, index) => {
        const subs = Array.isArray(r.subjects) ? `<ul style="margin: 0; padding-left: 1.2rem; font-size: 0.85rem;">${r.subjects.map(s => `<li>${s.name}: ${Number(s.obtained)}/${Number(s.total)} (${s.grade || '-'})</li>`).join('')}</ul>` : '-';
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${r.classLevel} / ${r.section || '-'}</td>
                <td>${r.rollNumber || '-'}</td>
                <td><div style="font-weight:600;">${r.studentName}</div></td>
                <td>${r.examTitle}</td>
                <td>${subs}</td>
                <td><div style="font-weight:700; color:var(--accent-blue);">${Number(r.obtainedMarks)} / ${Number(r.totalMarks)}</div></td>
                <td><span class="badge ${r.remarks === 'Pass' ? 'badge-success' : 'badge-danger'}" style="background: ${r.remarks === 'Pass' ? 'rgba(36,134,54,0.1)' : 'rgba(215,58,73,0.1)'}; color: ${r.remarks === 'Pass' ? 'var(--success)' : 'var(--danger)'};">${r.remarks}</span></td>
            </tr>`;
    }).join('');
}

export { loadDashboard, loadHomework, loadMaterials, loadSyllabus, initExamTab };

/**
 * admin-dashboard.js
 * Full-featured admin dashboard with all CRUD operations restored.
 */

import { adminAPI, attendanceAPI, homeworkAPI, feesAPI, materialsAPI, notificationsAPI, resultsAPI, subjectsAPI, downloadFile, checkBackendHealth, waitForBackend, base_api_url, uploadFileWithProgress } from '../../core/api.js';
import { requireRole, getUserId, syncToSessionStorage, logout as authLogout, hideProtectionScreen } from '../../core/auth-manager.js';
import { escapeAttr as escapeAttrValue, escapeHtml, escapeHtml as escapeMarkup, safeFileName as safeDownloadName } from '../../core/sanitize.js';
import './admin-pending-approvals.js';
import './exam-results.js';

// 🛑 DOM GUARD
const isAdminPage = !!document.getElementById('admin-dashboard-root');

// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
// ROUTE PROTECTION
if (isAdminPage && !requireRole('admin')) {
    throw new Error('Unauthorized: Admin role required');
}

// Global logout handler
window.handleLogout = function () {
    // Admin logging out
    authLogout();
};

if (isAdminPage) {
    syncToSessionStorage('admin'); // Ensure sessionStorage is in sync
}

// Removed global API exposures for security

// Remove full-screen "Loading..." overlay as soon as this module runs (deferred modules execute
// after the document is parsed, so #auth-protection-screen already exists). Relying only on
// DOMContentLoaded misses bfcache restores and edge cases where the event already fired.
if (isAdminPage) {
    hideProtectionScreen();
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) hideProtectionScreen();
    });
}


let currentTab = 'dashboard';

let allHomeworkData = [];
let allFeesData = [];
let currentEditHwId = null;

// Upload-First State
let pendingMaterialUpload = null;
let pendingHomeworkUpload = null;
let pendingNoticeUpload = null;
console.log('🚀 admin-dashboard.js loaded.');

// =============================================
// INIT
// =============================================
async function initDashboard() {
    if (!isAdminPage) return;
    hideProtectionScreen();

    const adminId = getUserId();
    const adminRole = 'admin';
    const adminPhone = sessionStorage.getItem('adminPhone');

    if (!adminId) {
        console.error('âŒ No admin ID found');
        window.location.href = '/';
        return;
    }

    const nameStr = `Admin`;
    const nameEls = document.querySelectorAll('#admin-name, #dropdown-admin-name');
    nameEls.forEach(el => el.textContent = nameStr);

    const initialEl = document.getElementById('admin-avatar-initial');
    if (initialEl) initialEl.textContent = nameStr.charAt(0).toUpperCase();

    const ddEmail = document.getElementById('dropdown-admin-email');
    if (ddEmail) ddEmail.textContent = sessionStorage.getItem('adminEmail') || `${adminPhone}@admin.local`;

    const profileBtn = document.getElementById('admin-profile-btn');
    const profileMenu = document.getElementById('admin-profile-dropdown');

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
            profileBtn.setAttribute('aria-expanded', !isExpanded);
            profileMenu.classList.toggle('open');
        });
    }

    const dropLogoutBtn = document.getElementById('dropdown-logout-btn');
    if (dropLogoutBtn) {
        dropLogoutBtn.addEventListener('click', window.handleLogout);
    }

    // Load dynamic profile data
    await updateAdminProfileUI();

    // Check backend health before loading dashboard
    showInfoAlert('Checking backend connection...');
    const isBackendReady = await waitForBackend(3, 1000);

    if (!isBackendReady) {
        hideInfoAlert();
        showErrorAlert('âŒ Backend server is not responding. Please ensure the backend server is running on port 3000.');
        console.error('Backend not available on localhost:3000');
        return;
    }

    hideInfoAlert();

    setupTabNavigation();

    // Initial load for active tab
    const activeTab = document.querySelector('.nav-link.active')?.getAttribute('data-tab');
    if (activeTab === 'subjects') loadSubjects();

    setupForms();
    await populateERPFilters();

    // ===== UNIFIED GLOBAL EVENT HANDLER =====
    // Single consolidated click handler for all UI interactions
    document.addEventListener('click', (e) => {
        // Close profile menu if clicking outside
        const profileBtn = document.getElementById('profile-btn');
        const profileMenu = document.getElementById('profile-menu');
        if (profileBtn && profileMenu) {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileBtn.setAttribute('aria-expanded', 'false');
                profileMenu.classList.remove('open');
            }
        }

        // Close any open action menu dropdowns if clicking outside
        if (!e.target.closest('.action-menu') && !e.target.closest('.action-menu-dropdown')) {
            document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
        }

        // Close any open action dropdowns if clicking outside
        if (!e.target.closest('.action-menu') && !e.target.closest('.action-dropdown')) {
            document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open'));
        }

        // Close mobile sidebar if clicking outside of it
        const sidebar = document.querySelector('.sidebar');
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (sidebar && sidebar.classList.contains('active')) {
            // Check if the click was outside the sidebar and also outside the toggle button
            if (!sidebar.contains(e.target) && (!mobileToggle || !mobileToggle.contains(e.target))) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Close modals when clicking on modal background (deprecated - use proper modal handlers)
    window.addEventListener('click', (e) => {
        const addStudentModal = document.getElementById('add-student-modal');
        const addHomeworkModal = document.getElementById('add-homework-modal');
        const addFeeModal = document.getElementById('add-fee-modal');
        const timetableModal = document.getElementById('timetable-modal');

        if (addStudentModal === e.target) closeAddStudentModal();
        if (addHomeworkModal === e.target) closeAddHomeworkModal();
        if (addFeeModal === e.target) closeAddFeeModal();
        if (timetableModal === e.target) closeTimetableModal();
    });

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Header Logout
    const logoutBtn = document.getElementById('header-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', window.handleLogout);
    }

    // Close profile dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const profileContainer = document.querySelector('.admin-profile-menu');
        const dropdown = document.getElementById('admin-profile-dropdown');
        const profileBtn = document.getElementById('admin-profile-btn');

        if (profileContainer && dropdown && !profileContainer.contains(e.target)) {
            dropdown.classList.remove('open');
            if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Handle Category Dropdown clicks
    document.querySelectorAll('.dropdown-item[data-action]').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');
            console.log(`Action clicked: ${action}`);
            // Logic for different actions can be added here
            if (action === 'view-profile' || action === 'edit-profile') {
                showTab('settings'); // Or specific profile section
            }
            if (action === 'audit-logs') {
                loadAuditLogs();
            }
            // Close dropdown after action
            const dropdown = document.getElementById('admin-profile-dropdown');
            if (dropdown) dropdown.classList.remove('open');
        });
    });

    // Default tab
    await showTab('dashboard');
    // Timetable form is now handled via modal (see saveTimetableEntry function)

    // Wire up Notice form
    document.getElementById('notice-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('notice-title')?.value.trim();
        const message = document.getElementById('notice-message')?.value.trim();
        const classLevel = document.getElementById('notice-class')?.value || '';
        const recipientRole = document.getElementById('notice-role')?.value || '';
        const attachment = document.getElementById('notice-attachment')?.files[0];

        if (!title || !message) {
            showErrorAlert('Title and Message are required.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('message', message);
        formData.append('classLevel', classLevel);
        formData.append('recipientRole', recipientRole);

        // Upload-first check
        if (pendingNoticeUpload) {
            formData.append('attachmentId', pendingNoticeUpload.dbId);
            formData.append('attachmentUrl', pendingNoticeUpload.webViewLink);
        } else if (attachment) {
            formData.append('attachment', attachment);
        }

        const adminId = sessionStorage.getItem('adminUserId');
        if (adminId) formData.append('createdBy', adminId);

        try {
            showInfoAlert('Sending notice...');
            await notificationsAPI.create(formData);
            hideInfoAlert();
            closeNoticeModal();
            showSuccessAlert('✅ Notice sent!');
            pendingNoticeUpload = null; // Reset
            await loadNotifications();
        } catch (err) {
            hideInfoAlert();
            showErrorAlert('Failed to send notice: ' + err.message);
        }
    });
}

/**
 * Helper to populate subject dropdowns dynamically from assignments
 */
async function populateSubjectDropdown(classLevel, section = '', selectIds) {
    const ids = Array.isArray(selectIds) ? selectIds : [selectIds];
    if (!classLevel) {
        ids.forEach(id => {
            const sel = typeof id === 'string' ? document.getElementById(id) : id;
            if (sel) sel.innerHTML = '<option value="">-- Select Class First --</option>';
        });
        return;
    }

    try {
        // Fetch subjects assigned to this class level (and section if applicable)
        const res = await subjectsAPI.getAll(classLevel, section);
        const assignments = res.data || [];

        ids.forEach(id => {
            const sel = typeof id === 'string' ? document.getElementById(id) : id;
            if (!sel) return;

            const currentVal = sel.value;
            if (assignments.length === 0) {
                sel.innerHTML = '<option value="">No subjects assigned</option>';
            } else {
                sel.innerHTML = '<option value="">Select Subject</option>';
                assignments.forEach(item => {
                    // Use assignment.subject_id as value, master_name for label
                    sel.innerHTML += `<option value="${item.subject_id}">${escapeHtml(item.master_name || item.name)}</option>`;
                });
            }

            // Try to restore previous selection if it's still valid
            if (currentVal && assignments.some(a => a.subject_id === currentVal)) {
                sel.value = currentVal;
            }
        });
    } catch (err) {
        console.error('Failed to populate subjects:', err);
    }
}


async function populateERPFilters({
    classSelectId,
    sectionSelectId,
    subjectSelectId,
    teacherSelectId,
    onClassChange,
    onSectionChange,
    defaultClass = '',
    defaultSection = '',
    allClassesLabel = 'Select Class',
    allSectionsLabel = 'Select Section'
} = {}) {
    const classSel = typeof classSelectId === 'string' ? document.getElementById(classSelectId) : classSelectId;
    const sectionSel = typeof sectionSelectId === 'string' ? document.getElementById(sectionSelectId) : sectionSelectId;
    const subjectSel = typeof subjectSelectId === 'string' ? document.getElementById(subjectSelectId) : subjectSelectId;
    const teacherSel = typeof teacherSelectId === 'string' ? document.getElementById(teacherSelectId) : teacherSelectId;

    if (!classSel) return;

    // Helper to populate sections based on class
    const populateSections = async (classLevel, targetSection = '') => {
        if (!sectionSel) return;

        // Ensure visibility and reset state
        sectionSel.style.display = 'block';

        if (!classLevel) {
            sectionSel.innerHTML = `<option value="">${allSectionsLabel === 'Select Section' ? 'Select Class First' : allSectionsLabel}</option>`;
            sectionSel.disabled = (allSectionsLabel === 'Select Section');
            return;
        }

        try {
            sectionSel.innerHTML = '<option value="">Loading...</option>';
            sectionSel.disabled = false;

            const res = await adminAPI.getSections(classLevel);

            if (res.success) {
                const sections = res.data || [];
                if (sections.length === 0) {
                    sectionSel.innerHTML = '<option value="">No Sections</option>';
                } else {
                    sectionSel.innerHTML = `<option value="">${escapeHtml(allSectionsLabel)}</option>` +
                        sections.map(s => `<option value="${escapeAttrValue(s)}">${escapeHtml(s)}</option>`).join('');

                    if (targetSection && sections.includes(targetSection)) {
                        sectionSel.value = targetSection;
                    }
                }
            } else {
                console.error('API returned error for sections:', res.error);
                sectionSel.innerHTML = '<option value="">Error Loading</option>';
            }
        } catch (err) {
            console.error('Failed to fetch sections:', err);
            sectionSel.innerHTML = '<option value="">Error</option>';
        }
    };

    // Helper to populate subjects/teachers based on class+section
    const populateDependents = async (classLevel, section) => {
        if (subjectSel) {
            await populateSubjectDropdown(classLevel, section, subjectSel);
        }

        if (teacherSel) {
            if (!classLevel || !section) {
                teacherSel.innerHTML = '<option value="">Select Section First</option>';
                teacherSel.disabled = true;
                return;
            }

            try {
                teacherSel.innerHTML = '<option value="">Loading...</option>';
                teacherSel.disabled = false;

                const res = await adminAPI.getTeachersByClass(classLevel, section);
                const teachers = res.data || [];

                if (teachers.length === 0) {
                    teacherSel.innerHTML = '<option value="">No Teacher Assigned</option>';
                } else {
                    teacherSel.innerHTML = '<option value="">Select Teacher</option>' +
                        teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
                }
            } catch (err) {
                console.error('Failed to fetch teachers:', err);
                teacherSel.innerHTML = '<option value="">Error</option>';
            }
        }
    };

    try {
        // 1. Initial Class Population
        const classRes = await adminAPI.getClasses();
        const classes = classRes.data || [];

        classSel.innerHTML = `<option value="">${allClassesLabel}</option>` +
            classes.map(c => `<option value="${c}">Class ${c}</option>`).join('');

        // 2. Set Defaults if provided
        if (defaultClass && classes.includes(defaultClass)) {
            classSel.value = defaultClass;
            await populateSections(defaultClass, defaultSection);
            if (defaultSection) {
                await populateDependents(defaultClass, defaultSection);
            }
        }

        // 3. Event Listeners
        classSel.addEventListener('change', async () => {
            const classLevel = classSel.value;

            // Reset dependents
            if (sectionSel) {
                sectionSel.innerHTML = '<option value="">Resetting...</option>';
                sectionSel.value = '';
            }
            if (subjectSel) subjectSel.innerHTML = '<option value="">Select Section First</option>';
            if (teacherSel) {
                teacherSel.innerHTML = '<option value="">Select Section First</option>';
                teacherSel.disabled = true;
            }

            await populateSections(classLevel);
            if (onClassChange) onClassChange(classLevel);
        });

        if (sectionSel) {
            sectionSel.addEventListener('change', async () => {
                const classLevel = classSel.value;
                const section = sectionSel.value;

                await populateDependents(classLevel, section);
                if (onSectionChange) onSectionChange(classLevel, section);
            });
        }

    } catch (err) {
        console.error('ERP Filter Population Error:', err);
    }
}


// Execute initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// =============================================
// TAB NAVIGATION
// =============================================
function setupTabNavigation() {
    // Select both regular nav and bottom nav links
    document.querySelectorAll('.sidebar a.nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');
            if (tabName) showTab(tabName);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.remove('active');
            }
        });
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => {
        t.style.display = 'none';
        t.classList.remove('active');
    });
    // Update all nav links (regular and bottom nav)
    document.querySelectorAll('.sidebar a.nav-link').forEach(b => b.classList.remove('active'));

    const tab = document.getElementById(tabName) || document.getElementById('tab-' + tabName);
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }

    // Add active class to all matching nav links (both regular and bottom nav)
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(btn => {
        btn.classList.add('active');
    });

    currentTab = tabName;
    loadTabContent(tabName);
}

window.showTab = showTab;

async function loadTabContent(tabName) {
    switch (tabName) {
        case 'dashboard': await loadDashboardData(); break;
        case 'pending-approvals': await initPendingApprovalsTab(); break;
        case 'users': await loadUsers(); break;
        case 'students': await loadStudents(); break;
        case 'attendance': await initAttendanceTab(); break;
        case 'homework': await loadAllHomework(); break;
        case 'fees': await initFeesTab(); break;
        case 'materials': await loadMaterials(); break;
        case 'timetable': await loadTimetable(); break;
        case 'notifications': await loadNotifications(); break;
        case 'results':
            if (typeof window.initExamResults === 'function') {
                await window.initExamResults();
            } else {
                console.warn('⚠️ initExamResults not found');
            }
            break;
        case 'subjects': await loadSubjects(); break;
        case 'content-management': await loadContentManagement(); break;
    }
}

window.showTab = showTab;


// =============================================
// DASHBOARD
// =============================================
// Dashboard data cache
let dashboardData = {
    students: [],
    unpaidFees: [],
    financialSummary: {},
    attendanceStats: {},
    timetable: [],
    trends: [],
    latestStudents: [],
    latestPayments: [],
    latestHomework: []
};

// Dashboard data cache (internal)
let dashboardRefreshInterval = null;

async function loadDashboardData() {
    try {
        showInfoAlert('Loading dashboard...');

        // ✅ Add timeout wrapper to prevent hanging
        const dashboardTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Dashboard load timeout')), 15000)
        );

        const loadDataPromise = (async () => {
            // ✅ Load all data in parallel with proper timeout and error handling
            const [summaryRes, studentsRes, unpaidFeesRes, financialRes, timetableRes, trendsRes, attendanceRes] = await Promise.all([
                adminAPI.getDashboardSummary().catch(() => ({ data: {} })),
                adminAPI.getStudents().catch(() => ({ data: [] })),
                adminAPI.getUnpaidFees().catch(() => ({ data: [] })),
                adminAPI.getFinancialSummary?.().catch(() => ({})) ?? Promise.resolve({}),
                adminAPI.getTimetable?.().catch(() => ({ data: [] })) ?? Promise.resolve({ data: [] }),
                // ✅ Fetch 30-day trend data with timeout
                fetchTrendDataSafe().catch(() => ({ trends: [], summary: {} })),
                // ✅ Fetch attendance statistics with timeout
                adminAPI.getAttendanceStats?.().catch(() => ({})) ?? Promise.resolve({})
            ]);
            dashboardData.summary = summaryRes?.data || {};

            // ✅ Store data with null-safe access
            dashboardData.students = studentsRes?.data || [];
            dashboardData.unpaidFees = unpaidFeesRes?.data || [];
            // Extract report from nested structure if it exists
            dashboardData.financialSummary = (financialRes?.data) ? financialRes.data : (financialRes || {});
            dashboardData.timetable = timetableRes?.data || [];
            dashboardData.trends = trendsRes?.data || [];
            dashboardData.attendanceStats = (attendanceRes?.data) ? attendanceRes.data : (attendanceRes || {});

            // Fetch additional data for activity panel (non-critical, can fail silently)
            const [latestStudents, latestPayments, latestHomework] = await Promise.all([
                fetchLatestStudents().catch(() => []),
                fetchLatestPayments().catch(() => []),
                fetchLatestHomework().catch(() => [])
            ]);

            dashboardData.latestStudents = latestStudents;
            dashboardData.latestPayments = latestPayments;
            dashboardData.latestHomework = latestHomework;

            // ✅ Render all sections with individual error handling
            try { renderQuickStatsKPI(); } catch (e) { console.warn('[ADMIN] KPI render error:', e); }
            try { renderFeesOverviewChart(); } catch (e) { console.warn('[ADMIN] Fees overview error:', e); }
            try { renderGrowthTrendChart(); } catch (e) { console.warn('[ADMIN] Growth trend error:', e); }
            try { renderFeesChart(); } catch (e) { console.warn('[ADMIN] Fees chart error:', e); }
            try { renderClassDistributionLineChart(); } catch (e) { console.warn('[ADMIN] Class distribution error:', e); }
            try { renderTrendChart(); } catch (e) { console.warn('[ADMIN] Trend chart error:', e); }
            try { renderActivityPanel(); } catch (e) { console.warn('[ADMIN] Activity panel error:', e); }
            try { renderUnpaidFeesTable(); } catch (e) { console.warn('[ADMIN] Unpaid fees table error:', e); }
            try { renderRecentStudents(); } catch (e) { console.warn('[ADMIN] Recent students error:', e); }
            try { renderTodayTimetable(); } catch (e) { console.warn('[ADMIN] Today timetable error:', e); }
        })();

        // Wait for dashboard load with timeout protection
        await Promise.race([loadDataPromise, dashboardTimeout]);

        hideInfoAlert();
        console.log('[ADMIN] Dashboard loaded successfully');

        // Setup auto-refresh: only refresh when this tab is active AND page is visible
        if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = setInterval(() => {
            if (currentTab === 'dashboard' && !document.hidden) {
                loadDashboardData();
            }
        }, 30000); // Refresh every 30 seconds

    } catch (err) {
        hideInfoAlert();
        console.error('[ADMIN] Failed to load dashboard data:', err);
        // Show dashboard anyway with empty data
        showErrorAlert(`⚠ Dashboard data loading took too long or failed. Basic dashboard was shown. Error: ${err.message}`);

        // Attempt to render empty dashboard so user isn't stuck
        try {
            renderQuickStatsKPI();
            renderFeesOverviewChart();
            renderGrowthTrendChart();
        } catch (e) {
            console.error('Could not render empty dashboard:', e);
        }
    }
}

/**
 * Fetch 30-day trend data from backend with timeout
 * ✅ Uses proper apiCall wrapper with token and timeout
 */
async function fetchTrendDataSafe() {
    try {
        // Use Promise.race to add timeout protection
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Trend data fetch timeout')), 5000)
        );

        const trendPromise = adminAPI.getTrendData?.() ?? Promise.resolve({ trends: [], summary: {} });

        return await Promise.race([trendPromise, timeoutPromise]);
    } catch (error) {
        console.warn('⚠ Failed to fetch trend data:', error.message);
        // Return empty trends on failure - don't break dashboard
        return { trends: [], summary: {} };
    }
}

/**
 * Fetch latest students with timeout
 */
async function fetchLatestStudents() {
    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), 3000)
        );

        const res = await Promise.race([adminAPI.getStudents(), timeoutPromise]);
        if (res?.data && res.data.length > 0) {
            return res.data
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 3);
        }
        return [];
    } catch (err) {
        console.warn('⚠ Error fetching latest students:', err.message);
        return [];
    }
}

/**
 * Fetch latest payments (from unpaid fees, but find paid ones) with timeout
 */
async function fetchLatestPayments() {
    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), 3000)
        );

        // Fetch all fees and filter for paid ones
        const feesRes = await Promise.race([feesAPI.getAll(), timeoutPromise]);
        const fees = feesRes?.data || [];

        // Filter paid fees and get latest 3
        return fees
            .filter(f => f?.isPaid === true)
            .sort((a, b) => new Date(b.paidDate || b.createdAt || 0) - new Date(a.paidDate || a.createdAt || 0))
            .slice(0, 3);
    } catch (err) {
        console.warn('⚠ Error fetching latest payments:', err.message);
        return [];
    }
}

/**
 * Fetch latest homework with timeout
 */
async function fetchLatestHomework() {
    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), 3000)
        );

        const res = await Promise.race([homeworkAPI.getAll(), timeoutPromise]);
        const homework = res?.data || [];

        // Get latest 3
        return homework
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 3);
    } catch (err) {
        console.warn('⚠ Error fetching latest homework:', err.message);
        return [];
    }
}

// ===== RENDER FUNCTIONS =====

/**
 * Global Currency Formatter
 */
function formatCurrency(amount, options = {}) {
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: options.showDecimals ? 2 : 0,
            maximumFractionDigits: 2,
            ...options
        }).format(amount || 0);
    } catch (e) {
        return '₹0';
    }
}
// Internal currency formatter


/**
 * Render Quick Stats KPI Cards - with improved error handling
 * Displays key performance indicators at the top of the dashboard
 */
function renderQuickStatsKPI() {
    try {
        const el = id => document.getElementById(id);
        const summary = dashboardData?.summary || {};
        const unpaidFees = dashboardData?.unpaidFees || [];

        // 1. Total Students
        if (el('kpi-total-students')) {
            const total = summary.students?.total || 0;
            const active = summary.students?.active || 0;
            el('kpi-total-students').textContent = total;
            if (el('kpi-total-students-detail')) {
                el('kpi-total-students-detail').textContent = `${active} active, ${total - active} inactive`;
            }
        }

        // 2. Active Students
        if (el('kpi-active-students')) {
            const total = summary.students?.total || 1;
            const active = summary.students?.active || 0;
            const pct = ((active / total) * 100).toFixed(1);
            el('kpi-active-students').textContent = active;
            if (el('kpi-active-percentage')) {
                el('kpi-active-percentage').textContent = `${pct}% of total`;
            }
        }

        // 3. Fees Collected
        if (el('kpi-fees-collected')) {
            const paid = summary.financials?.totalPaid || 0;
            const pending = summary.financials?.totalPending || 0;
            const total = paid + pending;
            const pct = total > 0 ? ((paid / total) * 100).toFixed(1) : 0;
            el('kpi-fees-collected').textContent = formatCurrency(paid);
            if (el('kpi-collection-percentage')) {
                el('kpi-collection-percentage').textContent = `${pct}% collected`;
            }
        }

        // 4. Pending Fees
        if (el('kpi-fees-pending')) {
            const paid = summary.financials?.totalPaid || 0;
            const pending = summary.financials?.totalPending || 0;
            const total = paid + pending;
            const pct = total > 0 ? ((pending / total) * 100).toFixed(1) : 0;
            el('kpi-fees-pending').textContent = formatCurrency(pending);
            if (el('kpi-pending-percentage')) {
                el('kpi-pending-percentage').textContent = `${pct}% pending`;
            }
        }

        // 5. Overdue Fees (Keep frontend calculation for date-specific overdue check)
        if (el('kpi-fees-overdue')) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdueData = unpaidFees.reduce((acc, f) => {
                const dateStr = f?.dueDate || f?.due_date;
                if (!dateStr || !f?.amount) return acc;
                const dueDate = new Date(dateStr);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate < today) {
                    acc.count += 1;
                    acc.amount += parseFloat(f.amount) || 0;
                }
                return acc;
            }, { count: 0, amount: 0 });

            el('kpi-fees-overdue').textContent = formatCurrency(overdueData.amount);
            if (el('kpi-overdue-count')) {
                el('kpi-overdue-count').textContent = `${overdueData.count} students overdue`;
            }
        }

        // 6. Attendance Rate
        if (el('kpi-attendance-rate')) {
            const rate = summary.attendance?.monthlyRate || 0;
            el('kpi-attendance-rate').textContent = `${rate}%`;
            if (el('kpi-attendance-detail')) {
                el('kpi-attendance-detail').textContent = 'This month (avg.)';
            }
        }

        // 7. Total Users
        if (el('kpi-total-users')) {
            el('kpi-total-users').textContent = summary.users?.total || 0;
            if (el('kpi-total-users-detail')) {
                el('kpi-total-users-detail').textContent = `${summary.users?.pending || 0} pending approval`;
            }
        }

        // 8. Teachers Count
        if (el('kpi-teachers-count')) {
            el('kpi-teachers-count').textContent = summary.users?.teachers || 0;
        }

        // 9. Recent Homework
        if (el('kpi-recent-homework')) {
            el('kpi-recent-homework').textContent = summary.homework?.recentCount || 0;
        }

        console.log('[ADMIN] Quick Stats rendered successfully');
    } catch (err) {
        console.error('[ADMIN] Error rendering quick stats KPI:', err);
        showErrorAlert('Error rendering KPI cards: ' + err.message);
    }
}

/**
 * Render the 6 summary stat cards with color-coded calculations and click handlers
 */
/**
 * Render fees distribution pie chart (paid vs pending) with percentage labels
 */
function renderFeesChart() {
    const canvas = document.getElementById('fees-chart');
    const container = document.getElementById('fees-chart-loading');

    if (!canvas) return;

    const financials = dashboardData.financialSummary;
    const paidVal = financials.totalPaid || financials.total_paid || 0;
    const pendingVal = financials.totalPending || financials.total_pending || 0;
    const paid = parseFloat(paidVal);
    const pending = parseFloat(pendingVal);
    const total = paid + pending;

    // Don't render if no data
    if (total === 0) {
        if (container) container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No fee data available</p></div>';
        return;
    }

    // Hide loading indicator
    if (container) container.style.display = 'none';

    try {
        // Destroy existing chart if present
        if (window.feesChartInstance) {
            window.feesChartInstance.destroy();
        }

        // Calculate percentages
        const paidPercent = ((paid / total) * 100).toFixed(1);
        const pendingPercent = ((pending / total) * 100).toFixed(1);

        const ctx = canvas.getContext('2d');
        window.feesChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [`Paid (${paidPercent}%)`, `Pending (${pendingPercent}%)`],
                datasets: [{
                    data: [paid, pending],
                    backgroundColor: ['#22c55e', '#fb923c'],
                    borderColor: [getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary'), getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary')],
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12, weight: '600' },
                            padding: 15,
                            usePointStyle: true,
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim()
                        }
                    },
                    datalabels: {
                        display: true,
                        color: '#ffffff',
                        font: { weight: 'bold', size: 14 },
                        formatter: (value, ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${percentage}%`;
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return formatCurrency(context.parsed, { maximumFractionDigits: 0 });
                            }
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    } catch (err) {
        console.error('Error rendering fees chart:', err);
        if (container) container.innerHTML = '<p class="empty-state-text">Error loading chart</p>';
    }
}

/**
 * Render students distribution bar chart (by class) with enhanced tooltips
 */
function renderClassDistributionLineChart() {
    const canvas = document.getElementById('class-distribution-line-chart');
    const container = document.getElementById('class-distribution-line-loading');

    if (!canvas) return;

    // Group students by class
    const classCounts = {};
    dashboardData.students.forEach(student => {
        const cls = student.classLevel || 'Other';
        classCounts[cls] = (classCounts[cls] || 0) + 1;
    });

    const sortedClasses = Object.keys(classCounts).sort();
    const counts = sortedClasses.map(cls => classCounts[cls]);

    // Don't render if no data
    if (sortedClasses.length === 0) {
        if (container) container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No student data available</p></div>';
        return;
    }

    // Hide loading indicator
    if (container) container.style.display = 'none';

    try {
        // Destroy existing chart if present
        if (window.classDistributionLineChart) {
            window.classDistributionLineChart.destroy();
        }

        const ctx = canvas.getContext('2d');

        window.classDistributionLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedClasses.map(cls => `Class ${cls}`),
                datasets: [{
                    label: 'Number of Students',
                    data: counts,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 12, weight: '600' } } },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `Students: ${context.parsed.y}`;
                            },
                            afterLabel: function (context) {
                                const total = dashboardData.students.length || 1;
                                const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                return `Percentage: ${percentage}%`;
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 12 }
                    },
                    datalabels: {
                        display: true,
                        color: '#3b82f6',
                        font: { weight: 'bold', size: 12 },
                        anchor: 'top',
                        align: 'top',
                        offset: 10,
                        formatter: (value) => value
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    } catch (err) {
        console.error('Error rendering class distribution line chart:', err);
        if (container) container.innerHTML = '<p class="empty-state-text">Error loading chart</p>';
    }
}

/**
 * Render Fees Overview Chart (Collected vs Pending vs Overdue donut)
 */
function renderFeesOverviewChart() {
    try {
        const canvas = document.getElementById('fees-overview-chart');
        const container = document.getElementById('fees-overview-loading');

        if (!canvas) return;

        // ✅ Null-safe data access
        const financials = dashboardData?.financialSummary || {};
        const unpaidFees = dashboardData?.unpaidFees || [];

        const collectedVal = financials.totalPaid || financials.total_paid || 0;
        const pendingVal = financials.totalPending || financials.total_pending || 0;
        const collected = parseFloat(collectedVal);
        const pending = parseFloat(pendingVal);

        // Calculate overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = unpaidFees
            .filter(f => f?.dueDate || f?.due_date)
            .reduce((sum, f) => {
                const dueDate = new Date(f.dueDate || f.due_date);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate < today ? sum + (parseFloat(f.amount) || 0) : sum;
            }, 0);

        const total = collected + pending + overdue;
        if (total === 0) {
            if (container) container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No fees data</p></div>';
            return;
        }

        if (container) container.style.display = 'none';

        try {
            if (window.feesOverviewChart) window.feesOverviewChart.destroy();

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            window.feesOverviewChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [
                        `Collected (${formatCurrency(collected / 100000, { maximumFractionDigits: 1, style: 'decimal' })}L)`,
                        `Pending (${formatCurrency(pending / 100000, { maximumFractionDigits: 1, style: 'decimal' })}L)`,
                        `Overdue (${formatCurrency(overdue / 100000, { maximumFractionDigits: 1, style: 'decimal' })}L)`
                    ],
                    datasets: [{
                        data: [collected, pending, overdue],
                        backgroundColor: ['#22c55e', '#fb923c', '#ef4444'],
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 12, weight: '600' }, padding: 15 } },
                        datalabels: {
                            font: { weight: 'bold', size: 14 },
                            color: '#ffffff',
                            formatter: (value) => `${((value / total) * 100).toFixed(1)}%`
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
            console.log('[ADMIN] Fees overview chart rendered');
        } catch (chartErr) {
            console.error('Chart rendering error:', chartErr);
            if (container) container.innerHTML = '<p class="empty-state-text">Error loading chart</p>';
        }
    } catch (err) {
        console.error('Error setting up fees overview chart:', err);
    }
}

/**
 * Render Growth Trend Chart (Cumulative student enrollment over time)
 */
function renderGrowthTrendChart() {
    try {
        const canvas = document.getElementById('growth-trend-chart');
        const container = document.getElementById('growth-trend-loading');

        if (!canvas) return;

        // ✅ Null-safe data access
        const students = dashboardData?.students || [];

        // Group students by enrollment month
        const enrollmentByMonth = {};
        students.forEach(student => {
            if (!student?.createdAt) return;
            const date = new Date(student.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            enrollmentByMonth[monthKey] = (enrollmentByMonth[monthKey] || 0) + 1;
        });

        const sortedMonths = Object.keys(enrollmentByMonth).sort();
        if (sortedMonths.length === 0) {
            if (container) container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No enrollment history</p></div>';
            return;
        }

        if (container) container.style.display = 'none';

        if (window.growthTrendChart) window.growthTrendChart.destroy();

        // Calculate cumulative enrollment
        let cumulative = 0;
        const cumulativeData = sortedMonths.map(month => {
            cumulative += enrollmentByMonth[month];
            return cumulative;
        });

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        window.growthTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedMonths.map(m => m.substring(5) + '/' + m.substring(0, 4)),
                datasets: [{
                    label: 'Total Enrolled Students',
                    data: cumulativeData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 12, weight: '600' } } },
                    tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: 12, titleFont: { size: 12 } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error rendering growth trend chart:', err);
        if (container) container.innerHTML = '<p class="empty-state-text">Error loading chart</p>';
    }
}

/**
 * Render unpaid fees table (top 10, sorted by due date)
 */
function renderUnpaidFeesTable() {
    const tbody = document.getElementById('unpaid-fees-tbody');
    if (!tbody) return;

    const fees = dashboardData.unpaidFees || [];
    if (fees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No unpaid fees</td></tr>';
        return;
    }

    // Sort by due date (ascending - soonest first)
    const sorted = [...fees].sort((a, b) => new Date(a.dueDate || a.due_date) - new Date(b.dueDate || b.due_date));
    const topFees = sorted.slice(0, 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';
    topFees.forEach(fee => {
        const dueDate = new Date(fee.dueDate || fee.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        const overdueText = daysOverdue > 0 ? `${daysOverdue} days` : 'Due soon';
        const overdueClass = daysOverdue > 0 ? 'overdue' : '';

        html += `
            <tr>
                <td data-label="Name">${fee.studentName || '-'}</td>
                <td data-label="Class">${fee.classLevel || '-'}</td>
                <td data-label="Section">${fee.section || '-'}</td>
                <td data-label="Amount">${formatCurrency(fee.amount)}</td>
                <td data-label="Due Date">${new Date(fee.dueDate || fee.due_date).toLocaleDateString('en-IN')}</td>
                <td data-label="Days Overdue" class="status-${daysOverdue > 0 ? 'danger' : 'warning'}">${overdueText}</td>
                <td data-label="Contact">${fee.phone || '-'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Render recently added students (top 5)
 */
function renderRecentStudents() {
    const container = document.getElementById('recent-students-list');
    if (!container) return;

    const students = dashboardData.students || [];
    if (students.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox empty-state-icon"></i><p class="empty-state-text">No students enrolled yet</p></div>';
        return;
    }

    // Sort by creation date (newest first) if available, otherwise just take last 5
    const sorted = [...students].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.joiningDate || 0);
        const dateB = new Date(b.createdAt || b.joiningDate || 0);
        return dateB - dateA;
    });
    const recent = sorted.slice(0, 5);

    let html = '';
    recent.forEach(student => {
        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <p class="list-item-title">${student.name || '-'}</p>
                    <span class="list-item-badge">Class ${student.classLevel || '-'}</span>
                </div>
                <div class="list-item-meta">
                    <span><i class="fas fa-phone"></i> ${student.phone || '-'}</span>
                    <span><i class="fas fa-calendar"></i> ${student.joiningDate ? new Date(student.joiningDate).toLocaleDateString('en-IN') : '-'}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Render today's timetable schedule
 */
function renderTodayTimetable() {
    const container = document.getElementById('today-timetable-list');
    const dateEl = document.getElementById('today-date');

    if (!container) return;

    // Get current day name
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    if (dateEl) dateEl.textContent = today.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

    const timetable = dashboardData.timetable || [];

    // Filter by today's day
    const todayClasses = timetable.filter(t => {
        const normalizedDay = t.dayOfWeek
            ? t.dayOfWeek.charAt(0).toUpperCase() + t.dayOfWeek.slice(1).toLowerCase()
            : '';
        return normalizedDay === dayName;
    });

    if (todayClasses.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check empty-state-icon"></i><p class="empty-state-text">No classes scheduled for today</p></div>';
        return;
    }

    // Sort by start time
    const sorted = [...todayClasses].sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
    });

    let html = '';
    sorted.forEach(cls => {
        // Normalize time format
        let displayTime = cls.startTime || '';
        if (displayTime.includes(':')) {
            const parts = displayTime.split(':');
            displayTime = `${parts[0]}:${parts[1]}`;
        }

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <p class="list-item-title">${cls.subject || '-'}</p>
                    <span class="list-item-badge">Class ${cls.classLevel || '-'}</span>
                </div>
                <div class="list-item-meta">
                    <span><i class="fas fa-clock"></i> ${displayTime}</span>
                    <span><i class="fas fa-user-tie"></i> ${cls.teacherName || cls.teacherPhone || 'Unassigned'}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Render trend chart (30-day fees collected)
 */
function renderTrendChart() {
    const canvas = document.getElementById('trend-chart');
    const container = document.getElementById('trend-chart-loading');

    if (!canvas) return;

    const trendData = dashboardData.trends || [];
    if (trendData.length === 0) {
        if (container) container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No trend data available for the last 30 days</p></div>';
        return;
    }

    // Hide loading indicator
    if (container) container.style.display = 'none';

    try {
        // Destroy existing chart if present
        if (window.trendChartInstance) {
            window.trendChartInstance.destroy();
        }

        // Create a continuous 30-day timeline to ensure a line graph can be fully drawn
        const today = new Date();
        const dateMap = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' local time
            dateMap[dateStr] = 0;
        }

        // Fill with actual collected data
        trendData.forEach(d => {
            const rawDate = new Date(d.date);
            const dateStr = rawDate.toLocaleDateString('en-CA');
            if (dateMap[dateStr] !== undefined) {
                dateMap[dateStr] = parseFloat(d.amount) || 0;
            } else {
                // If the date somehow falls outside the 30-day window (e.g. timezone edge cases)
                // We add it just to be safe
                dateMap[dateStr] = parseFloat(d.amount) || 0;
            }
        });

        // Format labels and amounts for continuous chart plotting
        const sortedDateKeys = Object.keys(dateMap).sort();
        const labels = sortedDateKeys.map(dStr => {
            const date = new Date(dStr);
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        });

        const amounts = sortedDateKeys.map(dStr => dateMap[dStr]);

        const ctx = canvas.getContext('2d');
        window.trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Fees Collected (₹)',
                    data: amounts,
                    borderColor: '#0052cc',
                    backgroundColor: 'rgba(0, 82, 204, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#0052cc',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { size: 12, weight: '600' },
                            padding: 15,
                            usePointStyle: true,
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim()
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 12 },
                        callbacks: {
                            label: function (context) {
                                return formatCurrency(context.parsed.y, { maximumFractionDigits: 0 });
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + (value / 1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error rendering trend chart:', err);
        if (container) container.innerHTML = '<p class="empty-state-text">Error loading chart</p>';
    }
}

/**
 * Render recent activity panel (latest student, payment, homework)
 */
function renderActivityPanel() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    const activities = [];

    // Add all latest students (up to 2)
    if (dashboardData.latestStudents && dashboardData.latestStudents.length > 0) {
        dashboardData.latestStudents.slice(0, 2).forEach(student => {
            const date = new Date(student.createdAt || new Date());
            activities.push({
                type: 'recent-student',
                icon: 'fas fa-user-plus',
                title: student.name || 'New Student',
                subtitle: `Class ${student.classLevel || '-'}`,
                time: getRelativeTime(date),
                link: 'showTab("students")',
                timestamp: date.getTime()
            });
        });
    }

    // Add all latest payments (up to 2)
    if (dashboardData.latestPayments && dashboardData.latestPayments.length > 0) {
        dashboardData.latestPayments.slice(0, 2).forEach(payment => {
            const date = new Date(payment.createdAt || new Date());
            activities.push({
                type: 'recent-payment',
                icon: 'fas fa-money-bill-wave',
                title: `Payment: ${payment.studentName || 'Unknown'}`,
                subtitle: formatCurrency(payment.amount, { maximumFractionDigits: 0 }),
                time: getRelativeTime(date),
                link: 'showTab("fees")',
                timestamp: date.getTime()
            });
        });
    }

    // Add all latest homework (up to 2)
    if (dashboardData.latestHomework && dashboardData.latestHomework.length > 0) {
        dashboardData.latestHomework.slice(0, 2).forEach(hw => {
            const date = new Date(hw.createdAt || new Date());
            activities.push({
                type: 'recent-homework',
                icon: 'fas fa-book',
                title: hw.title || 'New Homework',
                subtitle: `Class ${hw.classLevel || '-'} • ${hw.subject || '-'}`,
                time: getRelativeTime(date),
                link: 'showTab("homework")',
                timestamp: date.getTime()
            });
        });
    }

    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox empty-state-icon"></i><p class="empty-state-text">No recent activity</p></div>';
        return;
    }

    // Sort activities by timestamp (most recent first) and take top 6
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const displayActivities = activities.slice(0, 6);

    let html = '';
    displayActivities.forEach(activity => {
        html += `
            <div class="activity-item ${activity.type}">
                <div class="activity-icon"><i class="${activity.icon}"></i></div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-subtitle">${activity.subtitle}</div>
                    <div class="activity-time">${activity.time}</div>
                    <a class="activity-link" href="#" onclick="${activity.link}; return false;">View →</a>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Helper: Convert date to relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// =============================================
// USERS - with Edit, Delete, Toggle Access
// =============================================
let allUsersData = [];
let showAllUsers = false;

async function loadUsers() {
    try {
        const res = await adminAPI.getUsers();
        allUsersData = res.data || [];
        filterUsersTable();
    } catch (err) {
        showErrorAlert('Failed to load users');
    }
}

window.filterUsersTable = function () {
    const roleQ = document.getElementById('user-role-filter')?.value || '';
    const statQ = document.getElementById('user-status-filter')?.value || '';
    const textQ = (document.getElementById('user-search')?.value || '').toLowerCase();

    const filtered = allUsersData.filter(u => {
        const matchRole = roleQ ? u.role === roleQ : true;
        const matchStat = statQ ? (statQ === 'active' ? u.isActive : !u.isActive) : true;
        const matchText = textQ ?
            (u.phone?.includes(textQ) || u.email?.toLowerCase().includes(textQ) || (u.name || '').toLowerCase().includes(textQ)) : true;
        return matchRole && matchStat && matchText;
    });

    renderUsersTable(filtered);
};

window.toggleShowAllUsers = function () {
    showAllUsers = !showAllUsers;
    filterUsersTable();
};

window.toggleAddUserForm = function () {
    const container = document.getElementById('add-user-container');
    const btn = document.getElementById('btn-toggle-add-user');

    if (!container || !btn) return;

    if (container.style.maxHeight === '0px' || container.style.maxHeight === '') {
        // Open
        container.style.maxHeight = '800px';
        container.style.opacity = '1';
        container.style.marginBottom = '2rem';
        btn.innerHTML = '<i class="fas fa-times"></i> Close Form';
        btn.style.backgroundColor = 'var(--text-muted)';
        btn.style.borderColor = 'var(--text-muted)';
    } else {
        // Close
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        container.style.marginBottom = '0';
        btn.innerHTML = '<i class="fas fa-plus"></i> Add User';
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
    }
};

window.toggleUserActionsMenu = function (id, event) {
    if (event) {
        event.stopPropagation();
    }
    // close others
    document.querySelectorAll('.actions-dropdown-menu.active').forEach(menu => {
        if (menu.id !== `user-actions-${id}`) {
            menu.classList.remove('active');
        }
    });
    const menu = document.getElementById(`user-actions-${id}`);
    if (menu) {
        menu.classList.toggle('active');
    }
};

// Global click to close open dropdowns
document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) {
        document.querySelectorAll('.action-menu-dropdown.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }
});

function renderUsersTable(users) {
    const tbody = document.getElementById('users-list');
    const toggleBtn = document.getElementById('btn-toggle-users');
    const countText = document.getElementById('users-count-text');
    if (!tbody) return;

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i><p>No users found. Click "Add User" to get started.</p></td></tr>';
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (countText) countText.textContent = '';
        return;
    }

    const displayLimit = 10;
    const toShow = showAllUsers ? users : users.slice(0, displayLimit);

    if (toggleBtn) {
        if (users.length > displayLimit) {
            toggleBtn.style.display = 'inline-block';
            toggleBtn.textContent = showAllUsers ? 'Show Less' : `Show All Users (${users.length})`;
        } else {
            toggleBtn.style.display = 'none';
        }
    }

    if (countText) {
        countText.textContent = `Showing ${toShow.length} of ${users.length} user(s)`;
    }

    tbody.innerHTML = toShow.map((u, index) => `
        <tr data-user-id="${u.id}">
            <td>${index + 1}</td>
            <td><code>${escapeHtml(u.teacherId || '-')}</code></td>
            <td><strong>${escapeHtml(u.name || '-')}</strong></td>
            <td>${escapeHtml(u.phone || '-')}</td>
            <td>${escapeHtml(u.email || '-')}</td>
            <td>${u.role ? escapeHtml(u.role.charAt(0).toUpperCase() + u.role.slice(1)) : '-'}</td>
            <td><span class="status-badge ${u.status === 'active' ? 'status-active' : (u.status === 'pending' ? 'status-pending' : 'status-rejected')}">${escapeHtml(u.status || (u.isActive ? 'active' : 'inactive'))}</span></td>
            <td>
                <div class="action-menu">
                    <button class="action-menu-btn" onclick="toggleUserMenu(event);">⋮</button>
                    <div class="action-menu-dropdown" data-user-id="${u.id}">
                        <button class="action-menu-item" onclick="editUser(${u.id})">
                            <i class="fas fa-pen" style="width: 16px;"></i> Edit
                        </button>
                        <button class="action-menu-item ${u.isActive ? 'success' : 'warning'}" onclick="toggleUserStatusById(${u.id}, ${!u.isActive})">
                            <i class="fas fa-${u.isActive ? 'ban' : 'check'}" style="width: 16px;"></i> ${u.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <div class="action-menu-divider"></div>
                        <button class="action-menu-item danger" data-user-id="${u.id}" data-user-name="${escapeAttrValue(u.name || '')}" onclick="deleteUserById(this.dataset.userId, this.dataset.userName)">
                            <i class="fas fa-trash-alt" style="width: 16px;"></i> Delete User
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    // Render mobile cards
    renderUsersCards(toShow);
}

window.toggleUserMenu = function (event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = btn.nextElementSibling;

    // Close all other dropdowns
    document.querySelectorAll('.action-menu-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });

    if (!dropdown.classList.contains('active')) {
        positionDropdown(btn, dropdown);
    }

    dropdown.classList.toggle('active');
};

window.closeAllUserMenus = function () {
    document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.remove('active'));
};

function renderUsersCards(list) {
    const cardsContainer = document.getElementById('users-cards');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = list.length ? list.map(u => {
        // Use name if it exists and isn't "User" (default), else initials of email or phone
        let initials = '?';
        if (u.name && u.name !== 'User') {
            initials = u.name.charAt(0).toUpperCase();
        } else if (u.email) {
            initials = u.email.charAt(0).toUpperCase();
        } else if (u.phone) {
            initials = (u.phone + '').charAt(0);
        }

        return `
        <div class="material-card" data-user-id="${u.id}">
            <div class="material-card-header" style="display:flex; align-items:center; gap:12px;">
                <div class="user-avatar" style="flex-shrink:0;">${escapeHtml(initials)}</div>
                <div class="user-info">
                    <h3 class="material-card-title" style="margin:0;">${escapeHtml(u.name || 'User')}</h3>
                    <p class="user-email-text" style="font-size: 0.8rem;">${escapeHtml(u.email || u.phone)}</p>
                </div>
            </div>
            <div class="material-card-content" style="margin: 1rem 0;">
                <div class="material-card-meta">
                    <div class="material-card-meta-item">
                        <i class="fas fa-user-tag" style="color: var(--accent-blue);"></i>
                        <span>Role: <strong>${escapeHtml(u.role)}</strong></span>
                    </div>
                    <div class="material-card-meta-item">
                        <i class="fas fa-circle" style="color: ${u.isActive ? 'var(--success)' : 'var(--warning)'}; font-size:8px;"></i>
                        <span>Status: <strong>${u.isActive ? 'Active' : 'Inactive'}</strong></span>
                    </div>
                </div>
            </div>
            <div class="material-card-actions">
                <button class="btn-table btn-edit" onclick="editUser(${u.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-table ${u.isActive ? 'btn-warning' : 'btn-success'}" onclick="toggleUserStatusById(${u.id}, ${!u.isActive})">
                    <i class="fas fa-${u.isActive ? 'ban' : 'check'}"></i> ${u.isActive ? 'Disable' : 'Enable'}
                </button>
                <button class="btn-table btn-delete" data-user-id="${u.id}" data-user-name="${escapeAttrValue(u.name || '')}" onclick="deleteUserById(this.dataset.userId, this.dataset.userName)">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>`;
    }).join('') : '<p style="text-align:center; color:var(--text-muted); padding:2rem;">No users found</p>';
}

window.editUser = async function (id) {
    const user = allUsersData.find(u => u.id === id);
    if (!user) return;
    closeAllUserMenus();

    // Fill basic info
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-phone').value = user.phone || '';
    document.getElementById('edit-user-email').value = user.email || '';

    const roleSelect = document.getElementById('edit-user-role');
    const assignmentSection = document.getElementById('edit-user-assignment-section');
    roleSelect.value = user.role || 'teacher';

    // Show/Hide assignment section based on role
    if (user.role === 'teacher' || user.role === 'staff') {
        assignmentSection.style.display = 'block';
        await populateEditUserAssignments(user.id);
    } else {
        assignmentSection.style.display = 'none';
    }

    // Add listener to role select to show/hide assignment section
    if (!roleSelect.dataset.listenerAdded) {
        roleSelect.addEventListener('change', (e) => {
            if (e.target.value === 'teacher' || e.target.value === 'staff') {
                assignmentSection.style.display = 'block';
                populateEditUserAssignments(document.getElementById('edit-user-id').value);
            } else {
                assignmentSection.style.display = 'none';
            }
        });
        roleSelect.dataset.listenerAdded = 'true';
    }

    openEditUserModal();
};

/**
 * Populate class checkboxes for user edit modal
 */
async function populateEditUserAssignments(userId) {
    const container = document.getElementById('edit-user-class-checkboxes');
    container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 10px; font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading classes...</p>';

    try {
        // 1. Fetch available class levels and current user assignments using centralized API
        const [classesData, currentData] = await Promise.all([
            adminAPI.getClassLevels(),
            adminAPI.getUserAssignments(userId)
        ]);

        if (classesData && classesData.success) {
            const availableClasses = classesData.classLevels || [];
            const currentAssignments = currentData && currentData.success ? (currentData.data || []) : [];

            if (availableClasses.length === 0) {
                container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; font-size: 0.8rem;">No classes found in system.</p>';
                return;
            }

            container.innerHTML = availableClasses.map(cl => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                    <input type="checkbox" id="edit-cl-${cl}" value="${cl}" ${currentAssignments.includes(cl) ? 'checked' : ''} style="cursor: pointer;">
                    <label for="edit-cl-${cl}" style="margin: 0; cursor: pointer; font-size: 0.85rem; font-weight: 500;">Class ${cl}</label>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--danger); font-size: 0.8rem;">Failed to load classes.</p>';
        }
    } catch (error) {
        console.error('Error populating assignments:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--danger); font-size: 0.8rem;">Error loading classes.</p>';
    }
}

window.cancelEditUser = function () {
    closeEditUserModal();
};

window.deleteUserById = async function (id, name = 'this user') {
    closeAllUserMenus();
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${name}"?\n\nThis action cannot be undone and will remove all associated records.`)) return;

    showInfoAlert(`Deleting user ${name}...`);
    try {
        const res = await adminAPI.deleteUser(id);
        hideInfoAlert();
        if (res.success) {
            showSuccessAlert('User deleted successfully');
            await loadUsers();
        } else {
            showErrorAlert(res.error || 'Failed to delete user');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to delete user');
    }
};

window.toggleUserStatusById = async function (id, isActive) {
    closeAllUserMenus();
    try {
        const res = await adminAPI.toggleUserStatus(id, isActive);
        if (res.success) {
            showSuccessAlert(isActive ? 'User enabled' : 'User disabled');
            await loadUsers();
        } else {
            showErrorAlert(res.error || 'Failed to update status');
        }
    } catch (err) {
        showErrorAlert(err.message || 'Failed to update status');
    }
};

// =============================================
// STUDENTS
// =============================================
let allStudentsData = [];
let showAllStudents = false;

async function loadStudents() {
    try {
        const res = await adminAPI.getStudents();
        allStudentsData = res.data || [];
        populateStudentClassDropdowns();
        filterStudentsTable();
    } catch (err) {
        showErrorAlert('Failed to load students');
    }
}

function populateStudentClassDropdowns() {
    const classSet = new Set();
    const secSet = new Set();
    allStudentsData.forEach(s => {
        if (s.classLevel) classSet.add(s.classLevel);
        if (s.section) secSet.add(s.section);
    });

    const classFilter = document.getElementById('student-class-filter');
    const secFilter = document.getElementById('student-section-filter');

    if (classFilter) {
        const currentVal = classFilter.value;
        classFilter.innerHTML = '<option value="">All Classes</option>' +
            Array.from(classSet).sort().map(c => `<option value="${c}">${c}</option>`).join('');
        classFilter.value = currentVal || '';
    }
    if (secFilter) {
        const currentVal = secFilter.value;
        secFilter.innerHTML = '<option value="">All Sections</option>' +
            Array.from(secSet).sort().map(s => `<option value="${s}">${s}</option>`).join('');
        secFilter.value = currentVal || '';
    }
}

window.filterStudentsTable = function () {
    const classQ = document.getElementById('student-class-filter')?.value || '';
    const secQ = document.getElementById('student-section-filter')?.value || '';
    const textQ = (document.getElementById('student-search')?.value || '').toLowerCase();

    const filtered = allStudentsData.filter(s => {
        const matchClass = classQ ? s.classLevel === classQ : true;
        const matchSec = secQ ? s.section === secQ : true;
        const matchText = textQ ?
            ((s.name || '').toLowerCase().includes(textQ) || (s.phone || '').includes(textQ) || (s.id?.toString() || '').includes(textQ)) : true;
        return matchClass && matchSec && matchText;
    });

    renderStudentsTable(filtered);
};

window.toggleShowAllStudents = function () {
    showAllStudents = !showAllStudents;
    filterStudentsTable();
};

function renderStudentsTable(students) {
    const tbody = document.getElementById('students-list');
    const toggleBtn = document.getElementById('btn-toggle-students');
    const countText = document.getElementById('students-count-text');
    if (!tbody) return;

    if (!students.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-inbox"></i><p>No students found. Click "Add Student" to get started.</p></td></tr>';
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (countText) countText.textContent = '';
        return;
    }

    const displayLimit = 10;
    const toShow = showAllStudents ? students : students.slice(0, displayLimit);

    if (toggleBtn) {
        if (students.length > displayLimit) {
            toggleBtn.style.display = 'inline-block';
            toggleBtn.textContent = showAllStudents ? 'Show Less' : `Show All Students (${students.length})`;
        } else {
            toggleBtn.style.display = 'none';
        }
    }

    if (countText) {
        countText.textContent = `Showing ${toShow.length} of ${students.length} student(s)`;
    }

    tbody.innerHTML = toShow.map(s => `
        <tr data-student-id="${s.id}">
            <td data-label="Name"><strong>${escapeHtml(s.name)}</strong></td>
            <td data-label="Roll No."><code>${escapeHtml(s.rollNumber || '-')}</code></td>
            <td data-label="Parents">${escapeHtml(s.fatherName || '-')}${s.motherName ? ' · ' + escapeHtml(s.motherName) : ''}</td>
            <td data-label="Phone">${escapeHtml(s.phone || '-')}</td>
            <td data-label="Class">${escapeHtml(s.classLevel || '-')}</td>
            <td data-label="Section">${escapeHtml(s.section || '-')}</td>
            <td data-label="Status"><span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-pending'}">${escapeHtml(s.status)}</span></td>
            <td data-label="Actions">
                <div class="action-menu">
                    <button class="action-menu-btn" onclick="toggleStudentMenu(event);">⋮</button>
                    <div class="action-menu-dropdown" data-student-id="${s.id}">
                        <button class="action-menu-item" onclick="openEditStudentModal(${s.id})">
                            <i class="fas fa-pen" style="width: 16px;"></i> Edit
                        </button>
                        <button class="action-menu-item ${s.status === 'active' ? 'success' : 'warning'}" onclick="toggleStudentStatusById(${s.id}, '${s.status === 'active' ? 'inactive' : 'active'}')">
                            <i class="fas fa-${s.status === 'active' ? 'ban' : 'check'}" style="width: 16px;"></i> ${s.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <div class="action-menu-divider"></div>
                        <button class="action-menu-item danger" data-student-id="${s.id}" data-student-name="${escapeAttrValue(s.name || '')}" onclick="deleteStudentById(this.dataset.studentId, this.dataset.studentName)">
                            <i class="fas fa-trash-alt" style="width: 16px;"></i> Delete Student
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

window.openAddStudentModal = function () {
    const modal = document.getElementById('add-student-modal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('add-student-form').reset();
        document.body.style.overflow = 'hidden';

        // Initialize dynamic dropdowns
        populateERPFilters({
            classSelectId: 'student-classLevel',
            sectionSelectId: 'student-section'
        });
    }
};

window.closeAddStudentModal = function () {
    const modal = document.getElementById('add-student-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.openEditStudentModal = async function (id) {
    const s = allStudentsData.find(st => st.id === id);
    if (!s) return;

    const modal = document.getElementById('edit-student-modal');
    if (modal) {
        document.getElementById('edit-student-id').value = s.id;
        document.getElementById('edit-student-name').value = s.name || '';
        document.getElementById('edit-student-phone').value = s.phone || '';
        document.getElementById('edit-student-email').value = s.email || '';
        document.getElementById('edit-student-fatherName').value = s.fatherName || '';
        document.getElementById('edit-student-motherName').value = s.motherName || '';

        // Initialize and pre-select dynamic dropdowns
        await populateERPFilters({
            classSelectId: 'edit-student-classLevel',
            sectionSelectId: 'edit-student-section',
            defaultClass: String(s.classLevel),
            defaultSection: s.section
        });

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        closeAllStudentMenus();
    }
};

window.closeEditStudentModal = function () {
    document.getElementById('edit-student-modal').style.display = 'none';
    document.getElementById('edit-student-form').reset();
    document.body.style.overflow = '';
};

window.toggleStudentMenu = function (event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = btn.closest('.action-menu').querySelector('.action-menu-dropdown');

    // Close other menus
    const wasActive = dropdown.classList.contains('active');
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));

    if (!wasActive) {
        // Position and show
        positionDropdown(btn, dropdown);
        dropdown.classList.add('active');
    }
};

window.closeAllStudentMenus = function () {
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
};

window.editStudent = function (id) {
    openEditStudentModal(id);
};

window.cancelEditStudent = function () {
    closeEditStudentModal();
};

window.deleteStudentById = async function (id, name = 'this student') {
    closeAllStudentMenus();
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE student "${name}"?\n\nThis will remove all their enrollment, attendance, and fee records forever.`)) return;

    showInfoAlert(`Deleting student ${name}...`);
    try {
        const res = await adminAPI.deleteStudent(id);
        hideInfoAlert();
        if (res.success) {
            showSuccessAlert('Student record deleted successfully');
            await loadStudents();
        } else {
            showErrorAlert(res.error || 'Failed to delete student');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to delete student');
    }
};

window.toggleStudentStatusById = async function (id, newStatus) {
    try {
        const res = await adminAPI.toggleStudentStatus(id, newStatus);
        if (res.success) {
            showSuccessAlert(newStatus === 'active' ? 'Student enabled' : 'Student disabled');
            await loadStudents();
        } else showErrorAlert(res.error || 'Failed to update status');
    } catch (err) {
        showErrorAlert(err.message || 'Failed to update status');
    }
};

// =============================================
// ATTENDANCE
// =============================================

// Populate class dropdown for homework modal
async function populateHomeworkClassDropdown(selectId) {
    try {
        const res = await attendanceAPI.getClasses();
        const classes = res.data || [];
        const sel = document.getElementById(selectId);
        if (!sel) return;

        // Preserve current selection if any
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">Select Class</option>';
        classes.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);

        if (currentVal && classes.includes(currentVal)) {
            sel.value = currentVal;
        }
    } catch (err) {
        console.error('Failed to load classes for homework:', err);
    }
}

async function initAttendanceTab() {
    try {
        // Initialize Daily Attendance Filters
        await populateERPFilters({
            classSelectId: 'att-class-select',
            sectionSelectId: 'att-section-select'
        });

        // Initialize Summary Filters
        await populateERPFilters({
            classSelectId: 'summary-class-select',
            sectionSelectId: 'summary-section-select'
        });

        const today = new Date().toISOString().split('T')[0];
        const dateEl = document.getElementById('att-date');
        if (dateEl) dateEl.value = today;
        const monthEl = document.getElementById('summary-month');
        if (monthEl) monthEl.value = today.slice(0, 7);
    } catch (err) {
        console.error('Attendance init error:', err);
        showErrorAlert('Failed to load attendance dropdowns');
    }
}

/**
 * Initialize Pending Approvals tab by fetching pending users
 */
async function initPendingApprovalsTab() {
    try {
        // Call the fetchPendingUsers function from admin-pending-approvals.js
        if (typeof window.fetchPendingUsers === 'function') {
            window.fetchPendingUsers();
        } else {
            // If the function isn't available yet, try again after a short delay
            console.warn('fetchPendingUsers not yet available, retrying...');
            setTimeout(() => {
                if (typeof window.fetchPendingUsers === 'function') {
                    window.fetchPendingUsers();
                } else {
                    showErrorAlert('Failed to load pending approvals module');
                }
            }, 100);
        }
    } catch (err) {
        console.error('Error initializing pending approvals:', err);
        showErrorAlert('Failed to load pending approvals');
    }
}

let attendanceData = {}; // studentId -> status

window.loadAttendanceSheet = async function () {
    const classLevel = document.getElementById('att-class-select').value;
    const date = document.getElementById('att-date').value;
    if (!classLevel || !date) { showErrorAlert('Select a class and date'); return; }

    try {
        const [studRes, attRes] = await Promise.all([
            attendanceAPI.getStudentsByClass(classLevel),
            attendanceAPI.getByClassAndDate(classLevel, date)
        ]);

        const container = document.getElementById('attendance-sheet');
        const list = document.getElementById('att-list-container');
        if (!container || !list) return;

        const students = studRes.data || [];
        const existingMap = {};
        (attRes.data || []).forEach(a => { existingMap[a.studentId] = a.status; });

        if (!students.length) {
            container.style.display = 'block';
            list.innerHTML = renderEmptyState(1, 'No students found in this class.');
            return;
        }

        // Reset data
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
                        <div class="att-student-name">${escapeHtml(s.name)}</div>
                        <div class="att-student-roll">Roll No: ${escapeHtml(s.rollNumber || 'N/A')}</div>
                    </div>
                </div>
                <div class="att-toggles">
                    <button class="att-toggle-btn ${currentStatus === 'present' ? 'active' : ''}" data-id="${s.id}" data-status="present">P</button>
                    <button class="att-toggle-btn ${currentStatus === 'absent' ? 'active' : ''}" data-id="${s.id}" data-status="absent">A</button>
                    <button class="att-toggle-btn ${currentStatus === 'late' ? 'active' : ''}" data-id="${s.id}" data-status="late">L</button>
                </div>
            `;

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

        // Setup "Mark All"
        const markAllBtn = document.getElementById('btn-mark-all-present');
        if (markAllBtn) {
            markAllBtn.onclick = () => {
                document.querySelectorAll('#att-list-container .att-toggle-btn[data-status="present"]').forEach(btn => {
                    if (!btn.classList.contains('active')) btn.click();
                });
            };
        }

    } catch (err) {
        showErrorAlert('Failed to load attendance sheet: ' + err.message);
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

window.submitAttendance = async function () {
    const classLevel = document.getElementById('att-class-select').value;
    const date = document.getElementById('att-date').value;

    // Check if any nulls
    const pendingCount = Object.values(attendanceData).filter(v => v === null).length;
    if (pendingCount > 0) {
        showErrorAlert(`Please mark attendance for all students (${pendingCount} remaining).`);
        return;
    }

    const records = Object.entries(attendanceData).map(([id, status]) => ({
        studentId: parseInt(id),
        classLevel,
        date,
        status: status || 'present'
    }));

    if (!records.length) { showErrorAlert('No data to save.'); return; }

    try {
        await attendanceAPI.markBulk(records);
        showSuccessAlert(`Attendance saved for ${records.length} students`);
    } catch (err) {
        showErrorAlert('Failed to save attendance: ' + err.message);
    }
};

window.loadAttendanceSummary = async function () {
    const classLevel = document.getElementById('summary-class-select').value;
    const month = document.getElementById('summary-month').value;
    if (!classLevel || !month) { showErrorAlert('Select class and month'); return; }
    try {
        const res = await attendanceAPI.getMonthlySummary(classLevel, month);
        const data = res.data || [];
        const container = document.getElementById('summary-table-container');
        if (!container) return;
        if (!data.length) { container.innerHTML = '<p>No data found.</p>'; return; }
        container.innerHTML = `
            <table class="data-table">
                <thead><tr><th>Name</th><th>Total</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th></tr></thead>
                <tbody>${data.map(r => {
            const pct = r.attendancePercent || 0;
            const color = pct >= 75 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#e74c3c';
            return `<tr>
                        <td>${escapeHtml(r.name)}</td><td>${escapeHtml(String(r.totalDays))}</td>
                        <td>${escapeHtml(String(r.presentCount))}</td><td>${escapeHtml(String(r.absentCount))}</td><td>${escapeHtml(String(r.lateCount || 0))}</td>
                        <td><strong style="color:${color}">${pct}%</strong></td>
                    </tr>`;
        }).join('')}</tbody>
            </table>`;
    } catch (err) {
        showErrorAlert('Failed to load summary');
    }
};

// =============================================
// HOMEWORK - FULL CRUD
// =============================================
let showAllHomework = false;

async function loadAllHomework() {
    try {
        showAllHomework = false; // Reset pagination when loading fresh data
        const res = await homeworkAPI.getAll();
        allHomeworkData = res.data || [];
        renderHomeworkTable(allHomeworkData);
    } catch (err) {
        showErrorAlert('Failed to load homework');
    }
}

function renderHomeworkTable(list) {
    const tbody = document.getElementById('homework-table-body');
    const toggleBtn = document.getElementById('btn-toggle-homework');
    const countText = document.getElementById('homework-count-text');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-inbox"></i><p>No homework found. Click "Add Homework" to get started.</p></td></tr>';
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (countText) countText.textContent = '';
        return;
    }

    const displayLimit = 10;
    const toShow = showAllHomework ? list : list.slice(0, displayLimit);

    tbody.innerHTML = toShow.map((hw, i) => {
        const due = hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : '-';
        const classLevel = hw.classLevel || '-';
        const section = hw.section || '-';
        const assignedByName = hw.assignedByName || 'Admin';
        return `<tr>
            <td data-label="Title"><strong>${escapeHtml(hw.title)}</strong></td>
            <td data-label="Class"><span class="status-badge status-active">${escapeHtml(classLevel)}</span></td>
            <td data-label="Section"><span class="status-badge" style="background-color: #e0e7ff; color: #4f46e5;">${escapeHtml(section)}</span></td>
            <td data-label="Subject">${escapeHtml(hw.subject || '-')}</td>
            <td data-label="Due Date">${escapeHtml(due)}</td>
            <td data-label="Assigned By"><span style="background: #f0f4ff; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${escapeHtml(assignedByName)}</span></td>
            <td data-label="Actions">
                <div class="action-menu">
                    <button class="action-menu-btn" onclick="toggleHomeworkMenu(event);">⋮</button>
                    <div class="action-menu-dropdown" data-hw-id="${hw.id}">
                        <button class="action-menu-item" type="button" data-action="edit" data-hw-id="${hw.id}">
                            <i class="fas fa-pen" style="width: 16px;"></i> Edit
                        </button>
                        <div class="action-menu-divider"></div>
                        <button class="action-menu-item danger" type="button" data-action="delete" data-hw-id="${hw.id}">
                            <i class="fas fa-trash" style="width: 16px;"></i> Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Attach event listeners to action menu items
    setTimeout(() => {
        document.querySelectorAll('#homework-table-body [data-action="edit"]').forEach(btn => {
            btn.removeEventListener('click', handleHomeworkEdit);
            btn.addEventListener('click', handleHomeworkEdit);
        });
        document.querySelectorAll('#homework-table-body [data-action="delete"]').forEach(btn => {
            btn.removeEventListener('click', handleHomeworkDelete);
            btn.addEventListener('click', handleHomeworkDelete);
        });
    }, 0);

    // Show toggle button if more items exist
    if (toggleBtn) {
        toggleBtn.style.display = list.length > displayLimit ? 'block' : 'none';
        toggleBtn.textContent = showAllHomework ? 'Show Less' : `Show All Homework (${list.length})`;
    }
    if (countText) {
        countText.textContent = `Showing ${toShow.length} of ${list.length} homework items`;
    }
}

// Event handlers for homework edit and delete
function handleHomeworkEdit(e) {
    e.preventDefault();
    e.stopPropagation();
    const hwId = parseInt(e.currentTarget.getAttribute('data-hw-id'));
    closeAllHomeworkMenus();
    openEditHomeworkModal(hwId);
}

function handleHomeworkDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    const hwId = parseInt(e.currentTarget.getAttribute('data-hw-id'));
    closeAllHomeworkMenus();
    deleteHomework(hwId);
}

window.toggleShowAllHomework = function () {
    showAllHomework = !showAllHomework;
    filterHomework();
};

window.filterHomework = function () {
    const q = (document.getElementById('hw-filter-class')?.value || '').toLowerCase();
    renderHomeworkTable(q ? allHomeworkData.filter(h =>
        (h.classLevel || '').toLowerCase().includes(q) ||
        h.title.toLowerCase().includes(q) ||
        h.subject.toLowerCase().includes(q)
    ) : allHomeworkData);
};

window.saveHomework = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById('hw-edit-id')?.value;
    const title = document.getElementById('hw-title')?.value.trim();
    const classLevel = document.getElementById('hw-class')?.value.trim();
    const section = document.getElementById('hw-section')?.value.trim();
    const subjectId = document.getElementById('hw-subject')?.value.trim();
    const dueDate = document.getElementById('hw-due-date')?.value;
    const description = document.getElementById('hw-description')?.value.trim();

    if (!title || !classLevel || !section || !subjectId) {
        showErrorAlert('Title, Class, Section and Subject are required');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('classLevel', classLevel);
    formData.append('section', section);
    formData.append('subjectId', subjectId);
    formData.append('dueDate', dueDate);
    formData.append('description', description);
    formData.append('assignedBy', sessionStorage.getItem('adminUserId') || '');

    // Upload-first check
    if (pendingHomeworkUpload) {
        formData.append('attachmentId', pendingHomeworkUpload.dbId);
        formData.append('attachmentUrl', pendingHomeworkUpload.webViewLink);
    } else {
        const fileInput = document.getElementById('hw-attachment');
        if (fileInput && fileInput.files[0]) {
            formData.append('attachment', fileInput.files[0]);
        }
    }

    try {
        showInfoAlert(id ? 'Updating homework...' : 'Adding homework...');
        const res = id
            ? await homeworkAPI.update(id, formData)
            : await homeworkAPI.create(formData);
        if (res.data) {
            hideInfoAlert();
            showSuccessAlert(id ? 'Homework updated successfully!' : 'Homework added successfully!');
            closeAddHomeworkModal();
            document.getElementById('homework-form').reset();
            pendingHomeworkUpload = null; // Reset
            await loadAllHomework();
        } else {
            hideInfoAlert();
            showErrorAlert(res.error || 'Failed to save homework');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to save homework');
    }
};

window.editHomework = function (id) {
    openEditHomeworkModal(id);
};

window.deleteHomework = async function (id) {
    if (!confirm('Delete this homework? This action cannot be undone.')) return;
    try {
        showInfoAlert('Deleting homework...');
        const res = await homeworkAPI.delete(id);
        if (res.message) {
            hideInfoAlert();
            showSuccessAlert('Homework deleted successfully');
            await loadAllHomework();
        } else {
            hideInfoAlert();
            showErrorAlert('Failed to delete homework');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to delete homework');
    }
};

// =============================================
// FEES - FULL CRUD WITH LAZYLOADING & DEBOUNCE
// =============================================
let showAllFees = false;
let feesFilterTimeout;
let feeStudentAutocompleteTimeout;
let selectedFeeStudentId = null;

/**
 * Setup student autocomplete for fee form
 */
function setupFeeStudentAutocomplete() {
    const searchInput = document.getElementById('fee-student-search');
    const dropdown = document.getElementById('fee-student-dropdown');
    const hiddenId = document.getElementById('fee-student-id');

    if (!searchInput || searchInput.dataset.autocompleteSetup) return;
    searchInput.dataset.autocompleteSetup = 'true';

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        clearTimeout(feeStudentAutocompleteTimeout);

        if (query.length < 1) {
            dropdown.style.display = 'none';
            selectedFeeStudentId = null;
            hiddenId.value = '';
            return;
        }

        feeStudentAutocompleteTimeout = setTimeout(() => {
            if (allStudentsData.length === 0) {
                dropdown.innerHTML = '<div class="autocomplete-item" style="text-align:center; color:var(--text-muted);">Loading students...</div>';
                dropdown.style.display = 'block';
                // Try to load students if for some reason they aren't loaded
                loadStudents().then(() => {
                    // Trigger input again to refresh with data
                    searchInput.dispatchEvent(new Event('input'));
                });
                return;
            }

            const filtered = allStudentsData.filter(s => {
                const name = (s.name || '').toLowerCase();
                const phone = (s.phone || '').toLowerCase();
                const roll = (s.rollNumber || '').toLowerCase();
                const id = (s.id || '').toString();
                return name.includes(query) || phone.includes(query) || roll.includes(query) || id.includes(query);
            });

            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="autocomplete-item" style="text-align:center; color:var(--text-muted);">No students found</div>';
                dropdown.style.display = 'block';
                return;
            }

            dropdown.innerHTML = filtered.map(s => `
                <div class="autocomplete-item" data-student-id="${s.id}" data-student-name="${escapeAttrValue(s.name || '')}" onclick="selectFeeStudent(this.dataset.studentId, this.dataset.studentName)">
                    <div class="autocomplete-item-content">
                        <div>
                            <div class="autocomplete-item-name">${escapeHtml(s.name || 'N/A')}</div>
                            <div class="autocomplete-item-meta">
                                Roll: ${escapeHtml(s.rollNumber || 'N/A')} | Class ${escapeHtml(s.classLevel)}${s.section ? '-' + escapeHtml(s.section) : ''}
                            </div>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">ID: ${s.id}</div>
                    </div>
                </div>
            `).join('');
            dropdown.style.display = 'block';
        }, 300);
    });

    // Close dropdown on ESC
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && !searchInput.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

/**
 * Select student from autocomplete
 */
window.selectFeeStudent = function (studentId, studentName) {
    const searchInput = document.getElementById('fee-student-search');
    const hiddenId = document.getElementById('fee-student-id');
    const dropdown = document.getElementById('fee-student-dropdown');

    if (searchInput) searchInput.value = studentName;
    if (hiddenId) hiddenId.value = studentId;
    if (dropdown) dropdown.style.display = 'none';

    selectedFeeStudentId = studentId;

    // Auto-focus amount field for quick entry
    setTimeout(() => {
        const amountField = document.getElementById('fee-amount');
        if (amountField) amountField.focus();
    }, 100);

    // Auto-fill description with default
    const descField = document.getElementById('fee-description');
    if (descField && !descField.value) {
        descField.value = 'Monthly Tuition Fee';
    }
};

/**
 * Set fee amount from quick button
 */
window.setFeeAmount = function (amount) {
    const field = document.getElementById('fee-amount');
    if (field) {
        field.value = amount;
        field.focus();
    }
};

/**
 * Set due date from quick option
 */
window.setFeeDate = function (option) {
    const today = new Date();
    let targetDate = new Date(today);

    if (option === 'today') {
        targetDate = today;
    } else if (option === 'plus30') {
        targetDate.setDate(today.getDate() + 30);
    } else if (option === 'plus60') {
        targetDate.setDate(today.getDate() + 60);
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    const field = document.getElementById('fee-due-date');
    if (field) field.value = dateStr;
};

/**
 * Setup description dropdown behavior
 */
function setupFeeDescriptionDropdown() {
    const select = document.getElementById('fee-description');
    const customInput = document.getElementById('fee-description-custom');

    if (!select) return;

    select.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customInput.style.display = 'block';
            customInput.focus();
        } else {
            customInput.style.display = 'none';
            customInput.value = '';
        }
    });
}

window.openAddFeeModal = function () {
    const modal = document.getElementById('add-fee-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Reset form
        document.getElementById('fee-student-search').value = '';
        document.getElementById('fee-student-id').value = '';
        document.getElementById('fee-amount').value = '';
        document.getElementById('fee-due-date').value = '';
        document.getElementById('fee-description').value = 'Monthly Tuition Fee';
        document.getElementById('fee-description-custom').style.display = 'none';
        document.getElementById('fee-description-custom').value = '';
        document.getElementById('fee-add-another').checked = false;
        document.getElementById('fee-student-dropdown').style.display = 'none';
        selectedFeeStudentId = null;

        // Setup event listeners
        setupFeeStudentAutocomplete();
        setupFeeDescriptionDropdown();

        // Focus search
        setTimeout(() => {
            document.getElementById('fee-student-search')?.focus();
        }, 100);
    }
};

window.closeAddFeeModal = function () {
    const modal = document.getElementById('add-fee-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    selectedFeeStudentId = null;
};

window.toggleShowAllFees = function () {
    showAllFees = !showAllFees;
    debouncedFilterFees();
};

window.debouncedFilterFees = function () {
    clearTimeout(feesFilterTimeout);
    feesFilterTimeout = setTimeout(() => {
        const query = document.getElementById('fee-search')?.value.toLowerCase() || '';
        const filtered = allFeesData.filter(f =>
            !f.paid &&
            ((f.studentName || '').toLowerCase().includes(query) ||
                (f.student_id?.toString() || '').includes(query) ||
                (f.description || '').toLowerCase().includes(query))
        );
        renderFeesTable(filtered);
    }, 300);
};

/**
 * Switch between fee sub-tabs (Active vs Payment History)
 */
window.switchFeeSubTab = function (subtab) {
    // Update button styles
    document.querySelectorAll('.fee-subtab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtab);
    });

    // Show/hide content
    document.getElementById('subtab-active').style.display = subtab === 'active' ? 'block' : 'none';
    document.getElementById('subtab-history').style.display = subtab === 'history' ? 'block' : 'none';

    // Load history if needed
    if (subtab === 'history') {
        loadPaymentHistory('all');
    }
};

/**
 * Debounced filter for payment history search
 */
let paymentHistoryFilterTimeout;
let allPaymentHistoryData = [];
let paymentHistoryFilter = 'all';

window.debouncedFilterPaymentHistory = function () {
    clearTimeout(paymentHistoryFilterTimeout);
    paymentHistoryFilterTimeout = setTimeout(() => {
        const query = document.getElementById('history-search')?.value.toLowerCase() || '';
        let filtered = allPaymentHistoryData;

        // Apply filter
        if (paymentHistoryFilter === 'paid') {
            filtered = filtered.filter(f => f.paid);
        } else if (paymentHistoryFilter === 'pending') {
            filtered = filtered.filter(f => !f.paid);
        }

        // Apply search
        if (query) {
            filtered = filtered.filter(f =>
                (f.studentName || '').toLowerCase().includes(query) ||
                (f.student_id?.toString() || '').includes(query) ||
                (f.description || '').toLowerCase().includes(query)
            );
        }

        renderPaymentHistoryTable(filtered);
    }, 300);
};

/**
 * Load payment history (all records, paid + pending)
 */
window.loadPaymentHistory = async function (filter = 'all') {
    paymentHistoryFilter = filter;

    // Update button styles
    document.getElementById('history-filter-all')?.classList.toggle('active', filter === 'all');
    document.getElementById('history-filter-paid')?.classList.toggle('active', filter === 'paid');
    document.getElementById('history-filter-pending')?.classList.toggle('active', filter === 'pending');

    try {
        const res = await feesAPI.getAll(); // Get all fees (paid + pending)
        allPaymentHistoryData = res.data || [];
        debouncedFilterPaymentHistory();
    } catch (err) {
        showErrorAlert('Failed to load payment history');
    }
};

/**
 * Render payment history table
 */
function renderPaymentHistoryTable(fees) {
    const tbody = document.getElementById('payment-history-body');
    const countText = document.getElementById('history-count-text');

    if (!tbody) return;

    if (!fees.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No fee records found</td></tr>';
        if (countText) countText.textContent = '';
        return;
    }

    tbody.innerHTML = fees.map((f, i) => {
        const dueDate = f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : 'Invalid Date';
        const paidDate = f.paidDate ? new Date(f.paidDate).toLocaleDateString('en-IN') : '-';
        const studentName = f.studentName && f.studentName !== 'undefined' && f.studentName !== 'N/A' ? f.studentName : `Student #${f.studentId}`;
        return `
            <tr>
                <td><strong>${studentName}</strong></td>
                <td>${formatCurrency(f.amount, { showDecimals: true })}</td>
                <td>${f.description || '-'}</td>
                <td>${dueDate}</td>
                <td>${paidDate}</td>
                <td>
                    <span class="badge ${f.paid ? 'badge-green' : 'badge-red'}">
                        ${f.paid ? '✅ Paid' : '⌛ Pending'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    if (countText) {
        countText.textContent = `Showing ${fees.length} record(s)`;
    }
}

async function initFeesTab() {
    try {
        if (allStudentsData.length === 0) {
            await loadStudents();
        }
        await loadFeeStats();
        await loadFees('all');
        // Reset to active tab
        switchFeeSubTab('active');
    } catch (err) {
        showErrorAlert('Failed to load fees');
    }
}

async function loadFeeStats() {
    try {
        const res = await feesAPI.getStats();
        const s = res.data || {};
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        // Handle both camelCase and snake_case
        const totalCollected = parseFloat(s.totalCollected || s.total_collected || 0);
        const totalPending = parseFloat(s.totalPending || s.total_pending || 0);
        const paidCount = parseInt(s.paidCount || s.paid_count || 0);
        const unpaidCount = parseInt(s.unpaidCount || s.unpaid_count || 0);

        set('fee-stat-collected', formatCurrency(totalCollected, { showDecimals: true }));
        set('fee-stat-pending', formatCurrency(totalPending, { showDecimals: true }));
        set('fee-stat-paid-count', paidCount);
        set('fee-stat-unpaid-count', unpaidCount);
    } catch (err) {
        console.error('Failed to load fee stats:', err);
    }
}

window.loadFees = async function (mode = 'all') {
    document.getElementById('fee-tab-all')?.classList.toggle('active', mode === 'all');
    document.getElementById('fee-tab-unpaid')?.classList.toggle('active', mode === 'unpaid');

    try {
        const res = mode === 'unpaid' ? await feesAPI.getUnpaid() : await feesAPI.getAll();
        allFeesData = res.data || [];
        // Active Fees tab only shows unpaid records
        const unpaidOnly = allFeesData.filter(f => !f.paid);
        renderFeesTable(unpaidOnly);
    } catch (err) {
        showErrorAlert('Failed to load fees');
    }
};

function renderFeesTable(fees) {
    console.log('[DEBUG] renderFeesTable called with:', fees);

    const tbody = document.getElementById('fees-table-body');
    const toggleBtn = document.getElementById('btn-toggle-fees');
    const countText = document.getElementById('fees-count-text');
    if (!tbody) return;

    if (!fees.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No fee records found</td></tr>';
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (countText) countText.textContent = '';
        return;
    }

    const displayLimit = 15;
    const toShow = showAllFees ? fees : fees.slice(0, displayLimit);

    if (toggleBtn) {
        if (fees.length > displayLimit) {
            toggleBtn.style.display = 'inline-block';
            toggleBtn.textContent = showAllFees ? 'Show Less' : `Show All Fees (${fees.length})`;
        } else {
            toggleBtn.style.display = 'none';
        }
    }

    if (countText) {
        countText.textContent = `Showing ${toShow.length} of ${fees.length} record(s)`;
    }

    tbody.innerHTML = toShow
        .filter(f => {
            if (!f.id && f.id !== 0) {
                console.warn('[WARN] Skipping fee record missing id:', f);
                return false;
            }
            return true;
        })
        .map((f, i) => {
            const dueDate = f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : 'Invalid Date';
            const studentName = f.studentName && f.studentName !== 'undefined' ? f.studentName : `Student #${f.studentId}`;

            return `
            <tr>
                <td data-label="#">${i + 1}</td>
                <td data-label="Student"><strong>${studentName}</strong></td>
                <td data-label="Class">${f.classLevel || '-'}</td>
                <td data-label="Section">${f.section || '-'}</td>
                <td data-label="Amount">${formatCurrency(f.amount, { showDecimals: true })}</td>
                <td data-label="Due Date">${dueDate}</td>
                <td data-label="Status"><span class="badge ${f.paid ? 'badge-green' : 'badge-red'}">${f.paid ? 'Paid' : 'Unpaid'}</span></td>
                <td data-label="Actions">
                    <div class="action-menu">
                        <button class="action-menu-btn" onclick="toggleFeeMenu(event);">⋮</button>
                        <div class="action-menu-dropdown" data-fee-id="${f.id}">
                            <button class="action-menu-item" onclick="toggleFeePaid(${f.id}, ${!f.paid})">
                                <i class="fas fa-${f.paid ? 'times-circle' : 'check-circle'}" style="width: 16px;"></i> ${f.paid ? 'Mark Unpaid' : 'Mark Paid'}
                            </button>
                            <div class="action-menu-divider"></div>
                            <button class="action-menu-item danger" onclick="deleteFeeRecord(${f.id})">
                                <i class="fas fa-trash" style="width: 16px;"></i> Delete
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
}

window.toggleFeeMenu = function (event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = btn.closest('.action-menu').querySelector('.action-menu-dropdown');

    // Close other menus
    const wasActive = dropdown.classList.contains('active');
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));

    if (!wasActive) {
        positionDropdown(btn, dropdown);
        dropdown.classList.add('active');
    }
};

/**
 * Helper function to position dropdown menu using fixed positioning
 * Handles overflow detection to flip menu direction if needed
 */
window.positionDropdown = function (btn, dropdown) {
    // Temporarily show to get dimensions accurately
    const originalDisplay = dropdown.style.display;
    const originalVisibility = dropdown.style.visibility;

    dropdown.style.display = 'block';
    dropdown.style.visibility = 'hidden';

    const btnRect = btn.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownHeight = dropdown.offsetHeight || 160;
    const dropdownWidth = dropdown.offsetWidth || 180;

    // Restore display
    dropdown.style.display = originalDisplay;
    dropdown.style.visibility = originalVisibility;

    const spaceBelow = viewportHeight - btnRect.bottom;
    const spaceAbove = btnRect.top;

    // Position below by default
    let top = btnRect.bottom + 5;
    // Align right edge of dropdown to right edge of button by default
    let left = btnRect.right - dropdownWidth;

    // If not enough space below, flip to above
    if (spaceBelow < dropdownHeight + 20 && spaceAbove > dropdownHeight) {
        top = btnRect.top - dropdownHeight - 5;
    }

    // Prevent going off-screen horizontally (Collision Detection)
    if (left < 10) {
        left = 10; // Margin from left
    }
    if (left + dropdownWidth > viewportWidth - 10) {
        left = viewportWidth - dropdownWidth - 10; // Margin from right
    }

    dropdown.style.position = 'fixed';
    dropdown.style.top = top + 'px';
    dropdown.style.left = left + 'px';
    dropdown.style.right = 'auto';
    dropdown.style.width = 'auto'; // Allow CSS max-width to take over
    dropdown.style.maxHeight = '90vh';
    dropdown.style.overflowY = 'auto';
};

window.closeAllFeeMenus = function () {
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
};

window.saveFee = async function () {
    const studentIdInput = document.getElementById('fee-student-id')?.value;
    const amount = document.getElementById('fee-amount')?.value;
    const dueDate = document.getElementById('fee-due-date')?.value;
    const descriptionSelect = document.getElementById('fee-description')?.value;
    const descriptionCustom = document.getElementById('fee-description-custom')?.value.trim();
    const addAnother = document.getElementById('fee-add-another')?.checked;

    // Validate fields
    const studentError = document.getElementById('fee-student-error');
    if (!studentIdInput) {
        if (studentError) studentError.style.display = 'block';
        showErrorAlert('Please select a valid student');
        return;
    }
    if (studentError) studentError.style.display = 'none';

    if (!amount || parseFloat(amount) <= 0) {
        showErrorAlert('Amount must be greater than 0');
        return;
    }

    if (!dueDate) {
        showErrorAlert('Due Date is required');
        return;
    }

    // Get final description
    const description = descriptionSelect === 'custom' ? descriptionCustom : descriptionSelect;

    showInfoAlert('Adding fee...');
    try {
        const res = await feesAPI.add({
            studentId: parseInt(studentIdInput),
            amount: parseFloat(amount),
            dueDate,
            description
        });

        if (res.data) {
            hideInfoAlert();
            showSuccessAlert('✅ Fee added successfully');

            if (addAnother) {
                // Keep modal open, reset form (keep student)
                const studentName = document.getElementById('fee-student-search')?.value;
                document.getElementById('fee-amount').value = '';
                document.getElementById('fee-due-date').value = '';
                document.getElementById('fee-description').value = 'Monthly Tuition Fee';
                document.getElementById('fee-description-custom').style.display = 'none';
                document.getElementById('fee-description-custom').value = '';

                // Focus amount field for quick entry
                setTimeout(() => {
                    document.getElementById('fee-amount')?.focus();
                }, 100);
            } else {
                // Close modal and refresh
                closeAddFeeModal();
                await initFeesTab();
            }
        } else {
            hideInfoAlert();
            showErrorAlert(res.error || 'Failed to add fee');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to add fee');
    }
};

/**
 * Show confirmation modal before marking fee as paid
 */
let pendingMarkPaidFeeId = null;

window.showMarkPaidConfirmation = function (feeId) {
    console.log('[DEBUG] showMarkPaidConfirmation called with feeId:', feeId);
    console.log('[DEBUG] allFeesData:', allFeesData);

    if (!feeId) {
        console.error('[ERROR] Invalid feeId passed to showMarkPaidConfirmation:', feeId);
        showErrorAlert('Error: Invalid fee ID');
        return;
    }

    const fee = allFeesData.find(f => f.id === feeId);
    console.log('[DEBUG] Found fee:', fee);

    if (!fee) {
        console.error('[ERROR] Fee not found in allFeesData for ID:', feeId);
        showErrorAlert('Error: Fee not found');
        return;
    }

    pendingMarkPaidFeeId = feeId;

    // Populate modal
    document.getElementById('mark-paid-student-name').textContent = fee.studentName || `Student #${fee.studentId}`;
    document.getElementById('mark-paid-amount').textContent = parseFloat(fee.amount).toFixed(2);
    document.getElementById('mark-paid-due-date').textContent = new Date(fee.dueDate).toLocaleDateString('en-IN');

    // Show modal
    const modal = document.getElementById('mark-paid-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeMarkPaidModal = function () {
    const modal = document.getElementById('mark-paid-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    pendingMarkPaidFeeId = null;
};

window.confirmMarkPaid = async function () {
    if (!pendingMarkPaidFeeId) return;

    const feeId = pendingMarkPaidFeeId;
    closeMarkPaidModal();
    showInfoAlert('Marking fee as paid...');

    try {
        const res = await feesAPI.markPaid(feeId);
        if (res.data) {
            hideInfoAlert();
            showSuccessAlert('✅ Fee marked as paid');

            // Optimistically remove from active list
            allFeesData = allFeesData.filter(f => f.id !== feeId);

            // Refresh table and stats
            await loadFeeStats();
            await loadFees('all');

            // Also update the payment history tab so it shows up immediately
            await loadPaymentHistory(paymentHistoryFilter);
        } else {
            hideInfoAlert();
            showErrorAlert('Failed to mark fee as paid');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert('Failed to mark fee as paid: ' + (err.message || ''));
    }

    pendingMarkPaidFeeId = null;
};

window.toggleFeePaid = async function (id, markAsPaid) {
    console.log('[DEBUG] toggleFeePaid called with id:', id, 'markAsPaid:', markAsPaid);

    if (markAsPaid) {
        // Show confirmation modal before marking as paid
        showMarkPaidConfirmation(id);
    } else {
        // Mark as unpaid (direct, no confirmation needed)
        console.log('[DEBUG] Marking fee', id, 'as unpaid');
        showInfoAlert('Marking as unpaid...');
        try {
            const res = await feesAPI.markUnpaid(id);
            if (res.data) {
                hideInfoAlert();
                showSuccessAlert('Marked as Unpaid');
                await initFeesTab();
            } else {
                hideInfoAlert();
                showErrorAlert('Failed to update status');
            }
        } catch (err) {
            hideInfoAlert();
            console.error('[ERROR] Failed to mark unpaid:', err);
            showErrorAlert('Failed to update fee status: ' + err.message);
        }
    }
};

window.deleteFeeRecord = async function (id) {
    if (!confirm('Delete this fee record?')) return;
    showInfoAlert('Deleting fee...');
    try {
        const res = await feesAPI.delete(id);
        if (res.message || res.data) {
            hideInfoAlert();
            showSuccessAlert('Fee deleted');
            await initFeesTab();
        }
        else {
            hideInfoAlert();
            showErrorAlert('Failed to delete');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to delete');
    }
};

// =============================================
// MATERIALS - WITH LAZY LOADING & 3-DOT MENU
// =============================================

let allMaterialsData = [];
let showAllMaterials = false;
let materialsFilterTimeout;

// Delegated listener for materials table actions
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#materials-tbody .action-menu-item');
    if (!btn) return;

    const dropdown = btn.closest('.action-menu-dropdown');
    if (!dropdown) return;

    const materialIdStr = dropdown.getAttribute('data-material-id');
    const materialId = parseInt(materialIdStr);
    if (isNaN(materialId)) return;

    const action = btn.getAttribute('data-action');
    if (!action) return;

    // Resolve full material object from state
    const material = allMaterialsData.find(m => m.id === materialId);
    if (!material) {
        console.error('Material not found for ID:', materialId);
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Close the dropdown menu
    dropdown.classList.remove('active');

    if (action === 'download') {
        const title = material.title || 'material';
        const fileUrl = material.file_url || material.fileUrl;
        if (typeof window.downloadFile === 'function') {
            window.downloadFile(fileUrl, `${title}.pdf`);
        }
    } else if (action === 'edit') {
        if (typeof window.openMaterialModal === 'function') {
            window.openMaterialModal(material);
        }
    } else if (action === 'delete') {
        if (typeof window.deleteMaterial === 'function') {
            window.deleteMaterial(materialId);
        }
    }
});

async function loadMaterials() {
    try {
        showAllMaterials = false; // Reset pagination when loading fresh data
        const res = await materialsAPI.getAll();
        allMaterialsData = res.data || [];

        // Update stats
        updateMaterialsStats();

        // Render table
        renderMaterialsTable();
    } catch (err) {
        console.error('Error loading materials:', err);
        showErrorAlert('Failed to load materials');
    }
}

function updateMaterialsStats() {
    const totalCount = allMaterialsData.length;
    const uniqueClasses = new Set(allMaterialsData.map(m => m.class_level || m.classLevel)).size;
    const uniqueSubjects = new Set(allMaterialsData.map(m => m.subject)).size;

    // Count materials uploaded this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekCount = allMaterialsData.filter(m => {
        const uploadDate = new Date(m.created_at || m.createdAt);
        return uploadDate >= oneWeekAgo;
    }).length;

    document.getElementById('material-total-count').textContent = totalCount;
    document.getElementById('material-classes-count').textContent = uniqueClasses;
    document.getElementById('material-subjects-count').textContent = uniqueSubjects;
    document.getElementById('material-week-count').textContent = thisWeekCount;
}

function renderMaterialsTable() {
    const tbody = document.getElementById('materials-tbody');
    const toggleBtn = document.getElementById('btn-toggle-materials');
    const countText = document.getElementById('materials-count-text');
    const list = getFilteredMaterials();

    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i> No materials found</td></tr>';
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (countText) countText.textContent = '';
        return;
    }

    const displayLimit = 15;
    const toShow = showAllMaterials ? list : list.slice(0, displayLimit);

    tbody.innerHTML = toShow.map(m => `
        <tr>
            <td data-label="Title">
                <strong>${escapeHtml(m.title)}</strong>
                ${m.description ? `<br><small style="color: var(--text-muted);">${escapeHtml(m.description.substring(0, 50))}</small>` : ''}
            </td>
            <td data-label="Subject">${escapeHtml(m.subject_name || m.subject || '-')}</td>
            <td data-label="Class"><span class="badge">Class ${escapeHtml(m.class_level || m.classLevel)}</span></td>
            <td data-label="Section"><span class="badge secondary">${escapeHtml(m.section || 'All')}</span></td>
            <td data-label="Uploaded By">${escapeHtml(m.uploaded_by || m.uploadedBy || '-')}</td>
            <td data-label="Date"><small style="color: var(--text-muted);">${formatDate(m.created_at || m.createdAt)}</small></td>
            <td data-label="Actions">
                <div class="action-menu">
                    <button class="action-menu-btn" onclick="toggleMaterialMenu(event);">⋮</button>
                    <div class="action-menu-dropdown" data-material-id="${m.id}">
                        <button class="action-menu-item" type="button" data-action="download">
                            <i class="fas fa-download" style="width: 16px;"></i> Download
                        </button>
                        <button class="action-menu-item" type="button" data-action="edit">
                            <i class="fas fa-pen" style="width: 16px;"></i> Edit
                        </button>
                        <div class="action-menu-divider"></div>
                        <button class="action-menu-item danger" type="button" data-action="delete">
                            <i class="fas fa-trash" style="width: 16px;"></i> Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    // Show toggle button if more items exist
    if (toggleBtn) {
        toggleBtn.style.display = list.length > displayLimit ? 'block' : 'none';
        toggleBtn.textContent = showAllMaterials ? 'Show Less' : `Show More Materials (${list.length})`;
    }
    if (countText) {
        countText.textContent = showAllMaterials ? '' : `Showing ${toShow.length} of ${list.length}`;
    }
}

window.toggleShowAllMaterials = function () {
    showAllMaterials = !showAllMaterials;
    renderMaterialsTable();
};

window.toggleMaterialMenu = function (event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = btn.closest('.action-menu').querySelector('.action-menu-dropdown');

    // Close other menus
    const wasActive = dropdown.classList.contains('active');
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));

    if (!wasActive) {
        positionDropdown(btn, dropdown);
        dropdown.classList.add('active');
    }
};

window.closeAllMaterialMenus = function () {
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
};

function getFilteredMaterials() {
    const searchTerm = document.getElementById('material-search')?.value.toLowerCase() || '';
    const classFilter = document.getElementById('material-class-filter')?.value || '';
    const sectionFilter = document.getElementById('material-section-filter')?.value || '';
    const subjectFilter = document.getElementById('material-subject-filter')?.value || '';

    return allMaterialsData.filter(m => {
        const matchesSearch = !searchTerm ||
            m.title.toLowerCase().includes(searchTerm) ||
            (m.subject_name && m.subject_name.toLowerCase().includes(searchTerm)) ||
            (m.description && m.description.toLowerCase().includes(searchTerm));

        const matchesClass = !classFilter || (m.class_level || m.classLevel) === classFilter;
        const matchesSection = !sectionFilter || (m.section || '') === sectionFilter;
        const matchesSubject = !subjectFilter || (m.subject_id === subjectFilter || m.subject === subjectFilter);

        return matchesSearch && matchesClass && matchesSection && matchesSubject;
    });
}

window.filterMaterials = function () {
    renderMaterialsTable();
};

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}



window.saveMaterial = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    const id = document.getElementById('material-id')?.value;
    const title = document.getElementById('material-title')?.value;
    const description = document.getElementById('material-description')?.value;
    const subjectId = document.getElementById('material-subject')?.value;
    const classLevel = document.getElementById('material-class')?.value;
    const section = document.getElementById('material-section')?.value;
    const fileInput = document.getElementById('material-file');

    // Section is optional - leave empty to create shared materials for all sections
    if (!title || !classLevel || !subjectId) {
        showErrorAlert('Please fill in required fields: Title, Class, and Subject.');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (subjectId) formData.append('subjectId', subjectId);
    formData.append('classLevel', classLevel);
    formData.append('section', section);
    formData.append('uploadedBy', sessionStorage.getItem('adminName') || 'Admin');

    // Upload-first check
    if (pendingMaterialUpload) {
        formData.append('materialFileId', pendingMaterialUpload.dbId);
        formData.append('materialFileUrl', pendingMaterialUpload.webViewLink);
    } else if (fileInput.files[0]) {
        formData.append('materialFile', fileInput.files[0]);
    } else if (!id) {
        showErrorAlert('Please select a file to upload');
        return;
    }

    showInfoAlert(id ? 'Updating material...' : 'Uploading material...');
    try {
        let res;
        if (id) {
            res = await materialsAPI.update(id, formData);
            hideInfoAlert();
            showSuccessAlert('Material updated successfully');
        } else {
            res = await materialsAPI.create(formData);
            hideInfoAlert();
            showSuccessAlert('Material uploaded successfully');
        }
        closeMaterialModal();
        pendingMaterialUpload = null; // Reset
        await loadMaterials();
    } catch (err) {
        hideInfoAlert();
        console.error('Error saving material:', err);
        showErrorAlert('Error saving material: ' + err.message);
    }
};

window.deleteMaterial = async function (id) {
    if (!confirm('Are you sure you want to delete this material?')) return;
    showInfoAlert('Deleting material...');
    try {
        await materialsAPI.delete(id);
        hideInfoAlert();
        showSuccessAlert('Material deleted');
        closeAllMaterialMenus();
        await loadMaterials();
    } catch (err) {
        hideInfoAlert();
        console.error('Error deleting:', err);
        showErrorAlert('Error deleting: ' + err.message);
    }
};

window.openMaterialModal = async function (material = null) {
    const modal = document.getElementById('material-modal');
    const titleObj = document.getElementById('material-modal-title');
    const form = document.getElementById('material-form');
    const fileHint = document.getElementById('material-file-hint');
    const fileInput = document.getElementById('material-file');

    if (!modal || !form) return;

    resetUploadProgress('material');
    form.reset();
    if (fileHint) fileHint.style.display = 'none';
    if (fileInput) fileInput.required = true;

    // Use ERP helper
    await populateERPFilters({
        classSelectId: 'material-class',
        sectionSelectId: 'material-section',
        subjectSelectId: 'material-subject',
        defaultClass: material ? (material.classLevel || material.class_level) : '',
        defaultSection: material ? material.section : ''
    });

    if (material) {
        titleObj.innerText = 'Edit Study Material';
        document.getElementById('material-id').value = material.id;
        document.getElementById('material-title').value = material.title;
        document.getElementById('material-description').value = material.description || '';

        // Subject value setting
        const subSel = document.getElementById('material-subject');
        if (subSel) subSel.value = material.subjectId || material.subject_id || '';

        if (fileHint) fileHint.style.display = 'block';
        if (fileInput) fileInput.required = false;
    } else {
        titleObj.innerText = 'Add Study Material';
        document.getElementById('material-id').value = '';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    closeAllMaterialMenus();
};

// =============================================
// SUBJECTS MANAGEMENT (NORMALIZED)
// =============================================
let masterSubjectsData = [];
let subjectAssignmentsData = [];

window.loadSubjects = async function () {
    // This loads both lists for the Subjects tab
    await Promise.all([
        loadMasterSubjects(),
        loadSubjectAssignments()
    ]);

    // Initialize Filters if not already done
    const classFilt = document.getElementById('subject-class-filter');
    if (classFilt && !classFilt.hasAttribute('data-initialized')) {
        await populateERPFilters({
            classSelectId: 'subject-class-filter',
            sectionSelectId: 'subject-section-filter',
            onSectionChange: () => loadSubjectAssignments()
        });
        classFilt.setAttribute('data-initialized', 'true');
    }
};

async function loadMasterSubjects() {
    const tbody = document.getElementById('master-subjects-list');
    if (!tbody) return;

    try {
        const res = await subjectsAPI.getMaster();
        masterSubjectsData = res.data || [];

        if (masterSubjectsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No master subjects defined yet.</td></tr>';
            return;
        }

        tbody.innerHTML = masterSubjectsData.map(s => `
            <tr>
                <td data-label="Subject Name"><strong>${escapeHtml(s.name)}</strong></td>
                <td data-label="Code"><span class="badge secondary">${escapeHtml(s.code || '-')}</span></td>
                <td data-label="Actions" style="text-align:right;">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMasterSubject('${s.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load master subjects:', err);
    }
}

window.loadSubjectAssignments = async function () {
    const tbody = document.getElementById('subject-assignments-list');
    if (!tbody) return;

    const classFilt = document.getElementById('subject-class-filter')?.value;
    const sectionFilt = document.getElementById('subject-section-filter')?.value;

    try {
        const res = await subjectsAPI.getAll(classFilt, sectionFilt);
        subjectAssignmentsData = res.data || [];

        if (subjectAssignmentsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No assignments found for selected criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = subjectAssignmentsData.map(a => `
            <tr>
                <td data-label="Subject"><strong>${escapeHtml(a.master_name || a.name)}</strong></td>
                <td data-label="Class Level"><span class="badge">Class ${escapeHtml(a.class_level || a.classLevel)}</span></td>
                <td data-label="Section"><span class="badge secondary">${escapeHtml(a.section || 'All Sections')}</span></td>
                <td data-label="Teacher"><span style="color:var(--text-main); font-weight:500;">${escapeHtml(a.teacher_name || 'Not Assigned')}</span></td>
                <td data-label="Actions" style="text-align:right;">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAssignment('${a.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load assignments:', err);
    }
};

window.openAddSubjectModal = function () {
    const modal = document.getElementById('add-subject-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeAddSubjectModal = function () {
    document.getElementById('add-subject-modal').style.display = 'none';
    document.getElementById('add-subject-form').reset();
    document.body.style.overflow = '';
};

window.openAssignSubjectModal = async function () {
    const modal = document.getElementById('assign-subject-modal');
    const select = document.getElementById('assign-subject-id');
    const teacherSelect = document.getElementById('assign-subject-teacher');

    if (!modal || !select) return;

    // Fill subject dropdown from master list
    try {
        const subRes = await subjectsAPI.getMaster();
        const masters = subRes.data || [];
        select.innerHTML = '<option value="">Select a Subject...</option>' +
            masters.map(m => `<option value="${m.id}">${escapeHtml(m.name)} ${m.code ? `(${m.code})` : ''}</option>`).join('');

        // Use ERP helper for Class -> Section -> Teacher
        await populateERPFilters({
            classSelectId: 'assign-subject-class',
            sectionSelectId: 'assign-subject-section',
            teacherSelectId: 'assign-subject-teacher'
        });

    } catch (err) {
        showErrorAlert('Failed to load subjects or teachers');
        console.error(err);
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeAssignSubjectModal = function () {
    document.getElementById('assign-subject-modal').style.display = 'none';
    document.getElementById('assign-subject-form').reset();
    document.body.style.overflow = '';
};

// Handlers for Save/Delete
window.saveMasterSubject = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = document.getElementById('add-subject-name').value.trim();
    const code = document.getElementById('add-subject-code').value.trim();

    if (!name) { showErrorAlert('Name is required'); return; }

    showInfoAlert('Saving subject...');
    try {
        const res = await subjectsAPI.addMaster({ name, code });
        if (res.success) {
            showSuccessAlert('Subject added to master list');
            closeAddSubjectModal();
            loadMasterSubjects();
        } else {
            showErrorAlert(res.error || 'Failed to save');
        }
    } catch (err) { showErrorAlert(err.message); }
};

window.saveAssignment = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const subject_id = document.getElementById('assign-subject-id').value;
    const classLevel = document.getElementById('assign-subject-class').value;
    const section = document.getElementById('assign-subject-section').value;
    const teacher_id = document.getElementById('assign-subject-teacher').value;

    if (!subject_id || !classLevel || !teacher_id) {
        showErrorAlert('Subject, Class, and Teacher are required');
        return;
    }

    showInfoAlert('Assigning subject...');
    try {
        const res = await subjectsAPI.assign({
            subject_id,
            teacher_id,
            classLevel,
            section: section === 'ALL' ? null : section
        });
        if (res.success) {
            showSuccessAlert('Subject assigned successfully');
            closeAssignSubjectModal();
            loadSubjectAssignments();
        } else {
            showErrorAlert(res.error || 'Failed to assign');
        }
    } catch (err) { showErrorAlert(err.message); }
};

window.deleteMasterSubject = async function (id) {
    if (!confirm('Delete this master subject? This will NOT delete assignments but may cause issues if still in use.')) return;
    try {
        await subjectsAPI.deleteMaster(id);
        showSuccessAlert('Master subject deleted');
        loadMasterSubjects();
    } catch (err) { showErrorAlert(err.message); }
};

window.deleteAssignment = async function (id) {
    if (!confirm('Remove this subject assignment?')) return;
    try {
        await subjectsAPI.deleteAssignment(id);
        showSuccessAlert('Assignment removed');
        loadSubjectAssignments();
    } catch (err) { showErrorAlert(err.message); }
};

window.closeMaterialModal = function () {
    document.getElementById('material-modal').style.display = 'none';
    document.getElementById('material-form').reset();
    document.body.style.overflow = '';
};

async function initMaterialsTab() {
    try {
        await loadMaterials();

        // Initialize filters
        await populateERPFilters({
            classSelectId: 'material-class-filter',
            sectionSelectId: 'material-section-filter',
            subjectSelectId: 'material-subject-filter',
            onSectionChange: () => {
                // Optional: trigger refresh on filter change if needed
            }
        });

        // Set "All Subjects" for the filter
        const subFilter = document.getElementById('material-subject-filter');
        if (subFilter) {
            const originalOption = subFilter.innerHTML;
            subFilter.addEventListener('focus', () => {
                if (subFilter.options.length > 0 && subFilter.options[0].value === '') {
                    subFilter.options[0].textContent = 'All Subjects';
                }
            }, { once: true });
        }

    } catch (err) {
        console.error('Failed to init materials tab:', err);
        showErrorAlert('Failed to load materials');
    }
}

// =============================================
// HOMEWORK - MODAL FUNCTIONS
// =============================================
window.openAddHomeworkModal = async function () {
    const modal = document.getElementById('add-homework-modal');
    if (!modal) return;

    resetUploadProgress('hw');
    modal.style.display = 'block';
    document.getElementById('homework-form').reset();
    document.getElementById('hw-edit-id').value = '';
    document.getElementById('hw-current-attachment').style.display = 'none';
    document.body.style.overflow = 'hidden';

    // Use ERP helper
    await populateERPFilters({
        classSelectId: 'hw-class',
        sectionSelectId: 'hw-section',
        subjectSelectId: 'hw-subject'
    });
};

window.closeAddHomeworkModal = function () {
    document.getElementById('add-homework-modal').style.display = 'none';
    document.getElementById('homework-form').reset();
    document.body.style.overflow = '';
};

window.openEditHomeworkModal = async function (id) {
    const hw = allHomeworkData.find(h => h.id === id);
    if (!hw) return;

    resetUploadProgress('hw');
    document.getElementById('add-homework-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Populate ERP filters with defaults
    await populateERPFilters({
        classSelectId: 'hw-class',
        sectionSelectId: 'hw-section',
        subjectSelectId: 'hw-subject',
        defaultClass: hw.classLevel,
        defaultSection: hw.section || 'A'
    });

    // Populate form with homework data
    document.getElementById('hw-edit-id').value = hw.id;
    document.getElementById('hw-title').value = hw.title || '';

    // Note: class and section are handled by defaultClass/defaultSection in populateERPFilters
    // We might need a small delay or a way to ensure subject is set after it's loaded
    if (hw.subject_id || hw.subject) {
        // Since populateERPFilters is async and we await it, the subjects should be there
        const subSel = document.getElementById('hw-subject');
        if (subSel) subSel.value = hw.subject_id || hw.subject || '';
    }

    document.getElementById('hw-due-date').value = hw.dueDate ? hw.dueDate.split('T')[0] : '';
    document.getElementById('hw-description').value = hw.description || '';

    const attachInfo = document.getElementById('hw-current-attachment');
    if (attachInfo) {
        if (hw.attachmentUrl) {
            const fileName = hw.attachmentUrl.split('/').pop();
            attachInfo.textContent = `Current: ${fileName}`;
            attachInfo.style.display = 'block';
        } else {
            attachInfo.style.display = 'none';
        }
    }

    closeAllHomeworkMenus();
};

window.closeEditHomeworkModal = function () {
    document.getElementById('add-homework-modal').style.display = 'none';
    document.getElementById('homework-form').reset();
    document.getElementById('hw-edit-id').value = '';
    document.body.style.overflow = '';
};

window.toggleHomeworkMenu = function (event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = btn.closest('.action-menu').querySelector('.action-menu-dropdown');

    // Close other menus
    const wasActive = dropdown.classList.contains('active');
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));

    if (!wasActive) {
        // Position and show
        positionDropdown(btn, dropdown);
        dropdown.classList.add('active');
    }
};

window.closeAllHomeworkMenus = function () {
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
};


function populateDropdowns(ids, items, labelPrefix = '', defaultText = 'All') {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // Visibility handling: show if has data, hide if empty (for specific UI elements)
        if (id.includes('att-') || id.includes('summary-')) {
            el.style.display = items.length > 0 ? 'block' : 'none';
        }

        const currentValue = el.value;
        const isFilter = id.includes('filter') || id.includes('select');
        const firstOptionText = isFilter ? `${defaultText} ${labelPrefix}s` : `Select ${labelPrefix}`;

        el.innerHTML = `<option value="">${firstOptionText}</option>`;

        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = labelPrefix ? `${labelPrefix} ${item}` : item;
            el.appendChild(opt);
        });

        if (currentValue && items.includes(currentValue)) {
            el.value = currentValue;
        }
    });
}

function setupCascadingListeners() {
    // Map of class dropdowns to their dependent section dropdowns
    const cascadeMap = [
        { classId: 'student-class-filter', sectionIds: ['student-section-filter'] },
        { classId: 'att-class-select', sectionIds: ['att-section-select'] },
        { classId: 'summary-class-select', sectionIds: ['summary-section-select'] },
        { classId: 'subject-class-filter', sectionIds: ['subject-section-filter'] },
        { classId: 'tt-class', sectionIds: ['tt-section'], teacherIds: ['tt-teacher'] },
        { classId: 'material-class-filter', sectionIds: [] },
        { classId: 'assign-subject-class', sectionIds: ['assign-subject-section'], teacherIds: ['assign-subject-teacher'] },
        { classId: 'hw-class', sectionIds: ['hw-section'] },
        { classId: 'hw-edit-class', sectionIds: ['hw-edit-section'] },
    ];

    cascadeMap.forEach(map => {
        const classEl = document.getElementById(map.classId);
        if (!classEl) return;

        classEl.addEventListener('change', async () => {
            const classLevel = classEl.value;

            // 1. Update Sections
            if (map.sectionIds && map.sectionIds.length > 0) {
                const sections = classLevel ? await fetchSections(classLevel) : [];
                populateDropdowns(map.sectionIds, sections, 'Section');

                // Reset sections if class cleared
                if (!classLevel) {
                    map.sectionIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                }
            }

            // 2. Update Teachers (if applicable)
            if (map.teacherIds && map.teacherIds.length > 0) {
                const sectionEl = map.sectionIds && map.sectionIds.length > 0 ? document.getElementById(map.sectionIds[0]) : null;
                const section = sectionEl ? sectionEl.value : 'ALL';

                if (classLevel) {
                    const teachers = await fetchTeachersByClass(classLevel, section);
                    if (teachers) {
                        map.teacherIds.forEach(id => {
                            const el = document.getElementById(id);
                            if (el) {
                                el.innerHTML = '<option value="">Select Teacher</option>';
                                teachers.forEach(t => {
                                    const opt = document.createElement('option');
                                    opt.value = t.id;
                                    opt.textContent = t.name;
                                    el.appendChild(opt);
                                });
                            }
                        });
                    }
                } else {
                    map.teacherIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.innerHTML = '<option value="">Select Class First</option>';
                    });
                }
            }

            // 3. Special case for Timetable: Load subjects too
            if (map.classId === 'tt-class') {
                const sectionEl = document.getElementById('tt-section');
                const section = sectionEl ? sectionEl.value : '';
                if (classLevel && typeof populateSubjectDropdown === 'function') {
                    populateSubjectDropdown(classLevel, section, 'tt-subject');
                }
            }
        });

        // Add section listeners for teacher updates
        if (map.sectionIds && map.teacherIds) {
            map.sectionIds.forEach(sectionId => {
                const sectionEl = document.getElementById(sectionId);
                if (sectionEl) {
                    sectionEl.addEventListener('change', async () => {
                        const classLevel = classEl.value;
                        const section = sectionEl.value || 'ALL';
                        if (classLevel) {
                            const teachers = await fetchTeachersByClass(classLevel, section);
                            if (teachers) {
                                map.teacherIds.forEach(id => {
                                    const el = document.getElementById(id);
                                    if (el) {
                                        const currentTeacher = el.value;
                                        el.innerHTML = '<option value="">Select Teacher</option>';
                                        teachers.forEach(t => {
                                            const opt = document.createElement('option');
                                            opt.value = t.id;
                                            opt.textContent = t.name;
                                            el.appendChild(opt);
                                        });
                                        if (currentTeacher) el.value = currentTeacher;
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    });
}

/**
 * Shared helper for immediate file uploads with progress tracking
 */
async function handleDashboardFileUpload(fileInput, type, prefix) {
    const file = fileInput.files[0];
    if (!file) return null;

    const progressContainer = document.getElementById(`${prefix}-upload-progress`);
    const statusText = document.getElementById(`${prefix}-upload-status`);
    const percentText = document.getElementById(`${prefix}-upload-percent`);
    const progressBar = document.getElementById(`${prefix}-upload-bar`);

    // Find the submit button in the same modal/form to disable it
    const form = fileInput.closest('form');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressContainer.style.background = 'var(--bg-primary)';
    }
    if (statusText) statusText.textContent = 'Uploading...';
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.background = 'linear-gradient(90deg, var(--accent-blue), #764ba2)';
    }
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', file); // Field name must be 'file' to match backend handleFileUpload
    formData.append('type', type);

    // Optional metadata if available
    const classLevel = document.getElementById(`${prefix}-class`)?.value ||
        document.getElementById(`${prefix}-edit-class`)?.value;
    const section = document.getElementById(`${prefix}-section`)?.value ||
        document.getElementById(`${prefix}-edit-section`)?.value;

    if (classLevel) formData.append('classLevel', classLevel);
    if (section) formData.append('section', section);

    try {
        const res = await uploadFileWithProgress('/storage/upload', formData, (percent) => {
            if (percentText) percentText.textContent = `${percent}%`;
            if (progressBar) progressBar.style.width = `${percent}%`;
        });

        if (statusText) statusText.textContent = 'Upload Complete';
        if (progressBar) progressBar.style.background = 'var(--success)';
        if (submitBtn) submitBtn.disabled = false;

        return res; // res.dbId, res.fileId, res.webViewLink
    } catch (err) {
        if (statusText) statusText.textContent = 'Upload Failed';
        if (progressBar) progressBar.style.background = 'var(--danger)';
        if (submitBtn) submitBtn.disabled = false;
        console.error('Upload error:', err);
        showErrorAlert('Upload failed: ' + (err.error || err.message));
        return null;
    }
}

/**
 * Reset upload progress UI and pending state
 */
function resetUploadProgress(prefix) {
    const container = document.getElementById(`${prefix}-upload-progress`);
    const statusText = document.getElementById(`${prefix}-upload-status`);
    const percentText = document.getElementById(`${prefix}-upload-percent`);
    const progressBar = document.getElementById(`${prefix}-upload-bar`);

    if (container) container.style.display = 'none';
    if (statusText) statusText.textContent = 'Uploading...';
    if (percentText) percentText.textContent = '0%';
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.background = 'linear-gradient(90deg, var(--accent-blue), #764ba2)';
    }

    // Clear pending state
    if (prefix === 'material') pendingMaterialUpload = null;
    if (prefix === 'hw') pendingHomeworkUpload = null;
    if (prefix === 'notice') pendingNoticeUpload = null;
}

function setupForms() {
    const hwForm = document.getElementById('homework-form');
    if (hwForm) hwForm.addEventListener('submit', saveHomework);

    // Homework Attachment - Upload First
    document.getElementById('hw-attachment')?.addEventListener('change', async (e) => {
        pendingHomeworkUpload = await handleDashboardFileUpload(e.target, 'homework', 'hw');
    });

    // Event listeners for dynamic subjects in homework
    document.getElementById('hw-class')?.addEventListener('change', (e) => {
        populateSubjectDropdown(e.target.value, document.getElementById('hw-section').value, 'hw-subject');
    });
    document.getElementById('hw-section')?.addEventListener('change', (e) => {
        populateSubjectDropdown(document.getElementById('hw-class').value, e.target.value, 'hw-subject');
    });

    const matForm = document.getElementById('material-form');
    if (matForm) matForm.addEventListener('submit', saveMaterial);

    // Material File - Upload First
    document.getElementById('material-file')?.addEventListener('change', async (e) => {
        pendingMaterialUpload = await handleDashboardFileUpload(e.target, 'material', 'material');
    });

    // Event listeners for dynamic subjects in materials
    document.getElementById('material-class')?.addEventListener('change', (e) => {
        populateSubjectDropdown(e.target.value, document.getElementById('material-section').value, 'material-subject');
    });
    document.getElementById('material-section')?.addEventListener('change', (e) => {
        populateSubjectDropdown(document.getElementById('material-class').value, e.target.value, 'material-subject');
    });

    // Notice Attachment - Upload First
    document.getElementById('notice-attachment')?.addEventListener('change', async (e) => {
        pendingNoticeUpload = await handleDashboardFileUpload(e.target, 'notice', 'notice');
    });

    const subjectForm = document.getElementById('add-subject-form');
    if (subjectForm) subjectForm.addEventListener('submit', saveMasterSubject);

    const assignForm = document.getElementById('assign-subject-form');
    if (assignForm) assignForm.addEventListener('submit', saveAssignment);

    document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('user-name')?.value.trim(),
            username: document.getElementById('user-username')?.value.trim() || undefined,
            phone: document.getElementById('user-phone')?.value.trim(),
            email: document.getElementById('user-email')?.value.trim(),
            role: document.getElementById('user-role')?.value,
            password: document.getElementById('user-password')?.value
        };
        if (!payload.name || !payload.phone || !payload.role || !payload.password) {
            showErrorAlert('All required fields (*) must be filled');
            return;
        }
        try {
            showInfoAlert('Adding user...');
            const res = await adminAPI.addUser(payload);
            hideInfoAlert();
            if (res.success) {
                showSuccessAlert('User added successfully!');
                document.getElementById('add-user-form').reset();
                closeAddUserModal();
                await loadUsers();
            }
            else showErrorAlert(res.error || 'Failed to add user');
        } catch (err) {
            hideInfoAlert();
            showErrorAlert(err.message || 'Failed to add user');
        }
    });

    document.getElementById('edit-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id')?.value;
        const role = document.getElementById('edit-user-role')?.value;

        // Collect checked classes if it's a teacher/staff
        let classesAssigned = null;
        if (role === 'teacher' || role === 'staff') {
            classesAssigned = Array.from(
                document.querySelectorAll('#edit-user-class-checkboxes input[type="checkbox"]:checked')
            ).map(cb => cb.value);
        }

        const payload = {
            phone: document.getElementById('edit-user-phone')?.value,
            email: document.getElementById('edit-user-email')?.value,
            role: role,
            classesAssigned: classesAssigned
        };
        try {
            showInfoAlert('Updating user...');
            const res = await adminAPI.updateUser(id, payload);
            if (res.success) {
                showSuccessAlert('User updated successfully!');
                closeEditUserModal();
                e.target.reset();
                await loadUsers();
            } else {
                showErrorAlert(res.error || 'Failed to update user');
            }
        } catch (err) { showErrorAlert(err.message); }
    });

    document.getElementById('add-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('student-firstName')?.value.trim();
        const lastName = document.getElementById('student-lastName')?.value.trim();
        const email = document.getElementById('student-email')?.value.trim();
        const dobRaw = document.getElementById('student-dob')?.value; // YYYY-MM-DD

        if (!dobRaw) {
            showErrorAlert('Date of Birth is required!');
            return;
        }

        // Format YYYY-MM-DD -> DD/MM/YY for the backend
        const parts = dobRaw.split('-');
        if (parts.length !== 3 || parts.some(p => !p)) {
            showErrorAlert('Invalid date format. Please use YYYY-MM-DD.');
            return;
        }
        const [yyyy, mm, dd] = parts;
        const yy = yyyy.slice(2);
        const dateOfBirth = `${dd}/${mm}/${yy}`;

        const payload = {
            firstName,
            lastName,
            phone: document.getElementById('student-phone')?.value,
            email: email || null,
            classLevel: document.getElementById('student-classLevel')?.value,
            section: document.getElementById('student-section')?.value,
            fatherName: document.getElementById('student-fatherName')?.value,
            motherName: document.getElementById('student-motherName')?.value,
            dateOfBirth,
            joiningDate: new Date().toISOString().split('T')[0],
            status: 'active'
        };

        try {
            showInfoAlert('Adding student...');
            const res = await adminAPI.addStudent(payload);
            if (res.success) {
                hideInfoAlert();
                showSuccessAlert(`✅ Student added successfully! Roll Number: ${res.student.rollNumber}`);
                closeAddStudentModal();
                e.target.reset();
                await loadStudents();
            }
            else {
                hideInfoAlert();
                showErrorAlert(res.error || 'Failed to add student');
            }
        } catch (err) {
            hideInfoAlert();
            showErrorAlert(err.message);
        }
    });

    document.getElementById('edit-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-student-id')?.value;
        const payload = {
            name: document.getElementById('edit-student-name')?.value,
            classLevel: document.getElementById('edit-student-classLevel')?.value,
            section: document.getElementById('edit-student-section')?.value,
            phone: document.getElementById('edit-student-phone')?.value,
            email: document.getElementById('edit-student-email')?.value,
            fatherName: document.getElementById('edit-student-fatherName')?.value,
            motherName: document.getElementById('edit-student-motherName')?.value,
        };
        try {
            showInfoAlert('Updating student...');
            const res = await adminAPI.updateStudent(id, payload);
            if (res.success) {
                hideInfoAlert();
                showSuccessAlert('Student updated successfully!');
                closeEditStudentModal();
                e.target.reset();
                await loadStudents();
            } else {
                hideInfoAlert();
                showErrorAlert(res.error || 'Failed to update student');
            }
        } catch (err) {
            hideInfoAlert();
            showErrorAlert(err.message);
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', window.handleLogout);
}

// =============================================
// ALERTS
// =============================================
function showAlert(id, textId, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    document.getElementById(textId).textContent = msg || '';
    el.style.display = 'flex';
    setTimeout(() => el.style.display = 'none', 3500);
}
function showSuccessAlert(m) { showAlert('success-alert', 'success-text', m); }
function showErrorAlert(m) { showAlert('error-alert', 'error-text', m); }
function showInfoAlert(m, duration = 3500) {
    const el = document.getElementById('info-alert');
    if (el) {
        document.getElementById('info-text').textContent = m || '';
        el.style.display = 'flex';
        if (duration > 0) {
            setTimeout(() => {
                if (el.style.display === 'flex' && document.getElementById('info-text').textContent === m) {
                    el.style.display = 'none';
                }
            }, duration);
        }
    }
}
function hideInfoAlert() {
    const el = document.getElementById('info-alert');
    if (el) el.style.display = 'none';
}


// =============================================
// NOTIFICATIONS
// =============================================

async function loadNotifications() {
    const tbody = document.getElementById('notifications-list');
    if (!tbody) return;

    try {
        showInfoAlert('Loading notifications...');
        const res = await notificationsAPI.getAll();
        const items = res.data || [];
        hideInfoAlert();

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No notifications sent yet. Click "Send Notice" to create one.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(n => {
            const date = new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const recipient = n.classLevel
                ? `Class ${n.classLevel}${n.recipientRole ? ' · ' + n.recipientRole : ''}`
                : (n.recipientRole || 'All Users');
            const fileHtml = n.attachmentUrl
                ? `<button onclick="downloadFile('${escapeAttrValue(n.attachmentUrl)}', '${escapeAttrValue(safeDownloadName(n.title || 'notification') + '.pdf')}')" class="btn btn-xs btn-info"><i class="fas fa-file"></i> View</button>`
                : '<span style="color:var(--text-muted)">-</span>';
            return `
                <tr>
                    <td data-label="Date">${date}</td>
                    <td data-label="Title"><strong>${escapeMarkup(n.title)}</strong></td>
                    <td data-label="Message" style="max-width:250px; word-break:break-word;">${escapeMarkup(n.message)}</td>
                    <td data-label="Target"><span class="badge">${recipient}</span></td>
                    <td data-label="File">${fileHtml}</td>
                    <td data-label="Actions">
                        <button class="btn btn-danger btn-xs" onclick="deleteNotification(${n.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        hideInfoAlert();
        showErrorAlert('Failed to load notifications: ' + err.message);
    }
}

window.showSendNoticeModal = function () {
    const modal = document.getElementById('notice-modal');
    if (modal) {
        resetUploadProgress('notice');
        modal.style.display = 'flex';
        document.getElementById('notice-form')?.reset();
        document.body.style.overflow = 'hidden';

        // Initialize dynamic class dropdown
        populateERPFilters({
            classSelectId: 'notice-class',
            allClassesLabel: 'All Classes'
        });
    }
};

window.closeNoticeModal = function () {
    const modal = document.getElementById('notice-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.deleteNotification = async function (id) {
    if (!confirm('Delete this notification?')) return;
    try {
        // The notifications controller doesn't have a DELETE — call the API directly
        await notificationsAPI.delete(id);
        showSuccessAlert('Notification deleted');
        await loadNotifications();
    } catch (err) {
        showErrorAlert('Failed to delete: ' + err.message);
    }
};




// =============================================
// TIMETABLE
// =============================================

// Modal functions
window.openAddTimetableModal = function () {
    const modal = document.getElementById('timetable-modal');
    if (modal) {
        document.getElementById('tt-id').value = '';
        document.getElementById('timetable-form').reset();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        loadTimetableDropdowns();
    }
};

window.closeTimetableModal = function () {
    const modal = document.getElementById('timetable-modal');
    if (modal) modal.style.display = 'none';
    document.getElementById('timetable-form').reset();
    document.body.style.overflow = '';
};

window.toggleTimetableMenu = function (event, id) {
    event.stopPropagation();
    const menu = document.getElementById(`tt-menu-${id}`);

    // Close other open menus
    document.querySelectorAll('[id^="tt-menu-"]').forEach(m => {
        if (m !== menu) m.classList.remove('open');
    });

    // Position the menu
    const btn = event.currentTarget;
    if (menu && btn) {
        positionDropdown(btn, menu);
    }
    menu?.classList.add('open');
};

window.closeAllTimetableMenus = function () {
    document.querySelectorAll('[id^="tt-menu-"]').forEach(m => m.classList.remove('open'));
};

let allTeachersForTimetable = [];

async function loadTimetableDropdowns() {
    try {
        await populateERPFilters({
            classSelectId: 'tt-class',
            sectionSelectId: 'tt-section',
            subjectSelectId: 'tt-subject',
            teacherSelectId: 'tt-teacher'
        });
    } catch (err) {
        console.error('Failed to load timetable dropdowns:', err);
    }
}

window.saveTimetableEntry = async function () {
    const ttId = document.getElementById('tt-id')?.value;
    const payload = {
        dayOfWeek: document.getElementById('tt-day')?.value,
        startTime: document.getElementById('tt-start')?.value,
        endTime: document.getElementById('tt-end')?.value,
        subjectId: document.getElementById('tt-subject')?.value,
        classLevel: document.getElementById('tt-class')?.value,
        section: document.getElementById('tt-section')?.value,
        teacherId: document.getElementById('tt-teacher')?.value,
    };

    if (!payload.dayOfWeek || !payload.startTime || !payload.endTime || !payload.subjectId || !payload.classLevel || !payload.section || !payload.teacherId) {
        showErrorAlert('All fields including Section and Subject are required.');
        return;
    }

    try {
        showInfoAlert('Saving timetable entry...');
        if (ttId) {
            // Update existing (if implemented in API)
            await adminAPI.updateTimetable(ttId, payload);
        } else {
            await adminAPI.addTimetable(payload);
        }
        hideInfoAlert();
        showSuccessAlert('Timetable entry saved successfully!');
        closeTimetableModal();
        await loadTimetable();
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to save timetable entry');
    }
};

async function loadTimetable() {
    const container = document.getElementById('timetable-by-class');
    if (!container) return;

    try {
        showInfoAlert('Loading timetable...');
        const ttRes = await adminAPI.getTimetable();
        allTimetableData = ttRes.timetable || [];
        hideInfoAlert();
        renderTimetableByClass(allTimetableData);
    } catch (err) {
        hideInfoAlert();
        showErrorAlert('Failed to load timetable: ' + err.message);
    }
}

let allTimetableData = [];
let selectedTimetableDay = 'Monday'; // Default to Monday
let showAllTimetable = false;

function formatTime(t) {
    try {
        return new Date('1970-01-01T' + t + 'Z').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    } catch (e) {
        return t;
    }
}

// Select a day and render its timetable
window.selectTimetableDay = function (day) {
    selectedTimetableDay = day;
    // Day selected

    // Update active tab
    document.querySelectorAll('.day-tab').forEach(tab => {
        if (tab.getAttribute('data-day') === day) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Render the selected day
    renderTimetableByClass(allTimetableData);
};

// Generate time slots for calendar grid (7:00 AM to 6:00 PM in 1-hour slots)
function generateTimeSlots() {
    const slots = [];
    for (let hour = 7; hour < 18; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        slots.push(time);
    }
    return slots;
}

function renderTimetableByClass(items) {
    const container = document.getElementById('timetable-by-class');

    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '<div class="timetable-no-classes"><i class="fas fa-inbox"></i><p>No timetable entries found. Click "Add Entry" to create one.</p></div>';
        return;
    }

    // Debug: Log data
    // Rendering timetable

    // Filter entries by selected day
    const filteredEntries = items.filter(entry => {
        const normalizedDay = entry.dayOfWeek
            ? entry.dayOfWeek.charAt(0).toUpperCase() + entry.dayOfWeek.slice(1).toLowerCase()
            : '';
        return normalizedDay === selectedTimetableDay;
    });

    // Entries filtered

    if (filteredEntries.length === 0) {
        container.innerHTML = `<div class="timetable-no-classes"><i class="fas fa-calendar-day"></i><p>No classes scheduled for ${selectedTimetableDay}</p></div>`;
        return;
    }

    // Group entries by class level and section
    const classByLevel = {};
    filteredEntries.forEach(entry => {
        const classLevel = entry.classLevel || 'Unassigned';
        const sectionKey = entry.section ? `${classLevel} (${entry.section})` : classLevel;
        if (!classByLevel[sectionKey]) {
            classByLevel[sectionKey] = [];
        }
        classByLevel[sectionKey].push(entry);
    });

    // Sort each class's entries by start time
    Object.values(classByLevel).forEach(classEntries => {
        classEntries.sort((a, b) => {
            const timeA = a.startTime || '';
            const timeB = b.startTime || '';
            return timeA.localeCompare(timeB);
        });
    });

    let html = '';

    // Create cards for each class
    Object.keys(classByLevel).sort().forEach(groupKey => {
        const classEntries = classByLevel[groupKey];

        html += `
            <div class="class-timetable-card">
                <div class="class-timetable-header">
                    <i class="fas fa-chalkboard"></i>
                    <h4 class="class-timetable-title">Class ${groupKey}</h4>
                </div>
                <table class="class-timetable-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Subject</th>
                            <th>Teacher</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Add rows for each entry
        classEntries.forEach(entry => {
            // Normalize time (remove seconds)
            let displayTime = entry.startTime || '';
            if (displayTime.includes(':')) {
                const parts = displayTime.split(':');
                displayTime = `${parts[0]}:${parts[1]}`;
            }

            const teacherName = entry.teacherName || 'Unassigned';

            html += `
                        <tr>
                            <td data-label="Time">${escapeHtml(displayTime)}</td>
                            <td data-label="Subject">${escapeHtml(entry.subject)}</td>
                            <td data-label="Teacher">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span>${escapeHtml(teacherName)}</span>
                                    <div class="timetable-entry-menu">
                                        <button class="timetable-entry-menu-btn" onclick="toggleTimetableMenu(event, ${entry.id})" title="More options">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <div class="action-menu-dropdown" id="tt-menu-${entry.id}">
                                            <button class="action-menu-item" onclick="deleteTimetableRecord(${entry.id})">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.deleteTimetableRecord = async function (id) {
    if (!confirm('Delete this timetable entry?')) return;
    try {
        await adminAPI.deleteTimetable(id);
        showSuccessAlert('Timetable entry deleted!');
        closeAllTimetableMenus();
        await loadTimetable();
    } catch (err) {
        showErrorAlert('Failed to delete timetable: ' + err.message);
    }
};

window.openAddUserModal = function () {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeAddUserModal = function () {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.openEditUserModal = function () {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeEditUserModal = function () {
    const modal = document.getElementById('editUserModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.toggleUserActionMenu = function (event, id) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = document.getElementById(`user-actions-${id}`);

    // Close other open dropdowns
    document.querySelectorAll('.action-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
    });

    // Position the menu
    if (dropdown && btn) {
        positionDropdown(btn, dropdown);
    }
    dropdown?.classList.add('open');
};

/**
 * Fetches and updates the admin profile UI in the header/dropdown
 */
async function updateAdminProfileUI() {
    try {
        const response = await adminAPI.getProfile();
        if (response.success && response.data) {
            const data = response.data;

            // Update names
            document.querySelectorAll('#admin-name, #dropdown-admin-name').forEach(el => el.textContent = data.name);

            // Update emails
            document.querySelectorAll('#dropdown-admin-email').forEach(el => el.textContent = data.email || data.phone);

            // Update designation
            const designationEl = document.getElementById('dropdown-admin-designation');
            if (designationEl) {
                designationEl.textContent = data.designation || (data.organization_name ? `Admin • ${data.organization_name}` : 'Super Admin');
            }

            // Update avatars
            const initialLarge = document.getElementById('dropdown-admin-avatar-initial-large');
            const initialSmall = document.getElementById('admin-avatar-initial');
            const initial = data.name ? data.name.charAt(0).toUpperCase() : 'A';
            if (initialLarge) initialLarge.textContent = initial;
            if (initialSmall) initialSmall.textContent = initial;

            const avatarImg = document.getElementById('dropdown-admin-avatar-img');
            if (avatarImg && data.avatar_url) {
                avatarImg.src = data.avatar_url;
                avatarImg.style.display = 'block';
                if (initialLarge) initialLarge.style.display = 'none';
            }

            // Update last login
            const lastLoginEl = document.getElementById('dropdown-admin-last-login');
            if (lastLoginEl && data.last_login_at) {
                const date = new Date(data.last_login_at);
                const options = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
                const formattedDate = date.toLocaleDateString(undefined, options);
                lastLoginEl.textContent = `Last login: ${formattedDate}`;
            }
        }
    } catch (err) {
        console.error('Failed to update admin profile UI:', err);
    }
}

/**
 * Loads and displays audit logs in a modal
 */
window.loadAuditLogs = async function () {
    const modal = document.getElementById('audit-logs-modal');
    const tbody = document.getElementById('audit-logs-tbody');
    if (modal) modal.style.display = 'flex';

    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Fetching logs...</td></tr>';

    try {
        const response = await adminAPI.getAuditLogs();
        if (response.success && response.data) {
            if (response.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No audit logs found.</td></tr>';
                return;
            }

            tbody.innerHTML = response.data.map(log => {
                const action = log.action || '-';
                const badgeClass = action.includes('DELETE') ? 'badge-danger' : 'badge-primary';
                return `
                <tr>
                    <td>${escapeHtml(new Date(log.created_at).toLocaleString())}</td>
                    <td>${escapeHtml(log.admin_name || 'System')}</td>
                    <td><span class="badge ${badgeClass}">${escapeHtml(action)}</span></td>
                    <td>${escapeHtml(log.entity || '')} (${escapeHtml(String(log.entity_id || ''))})</td>
                    <td>${escapeHtml(log.details || '-')}</td>
                </tr>`;
            }).join('');
        }
    } catch (err) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state text-danger">Failed to load logs.</td></tr>';
    }
};

window.closeAuditLogsModal = () => document.getElementById('audit-logs-modal').style.display = 'none';

// Profile Actions
window.openChangePasswordModal = function () {
    // TODO: Implement full password change modal
    showInfoAlert('Password change feature coming soon! Please contact your administrator.', 4000);
};

window.openEditProfileModal = async function () {
    try {
        const res = await adminAPI.getProfile();
        if (res.success && res.data) {
            document.getElementById('edit-profile-name').value = res.data.name || '';
            document.getElementById('edit-profile-email').value = res.data.email || '';
            document.getElementById('edit-profile-designation').value = res.data.designation || '';
            document.getElementById('edit-profile-avatar').value = res.data.avatar_url || '';
            document.getElementById('edit-profile-modal').style.display = 'flex';
        }
    } catch (err) {
        showErrorAlert('Failed to fetch profile details');
    }
};


// =============================================
// DYNAMIC CONTENT PAGES (Help & Documentation)
// =============================================

window.openDocsModal = async () => cm_previewContent('documentation');
window.closeDocsModal = () => cm_closePreview();
window.openHelpModal = async () => cm_previewContent('help');
window.closeHelpModal = () => cm_closePreview();

// Dropdown Action Router
document.querySelectorAll('.profile-dropdown .dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const action = item.getAttribute('data-action');
        if (!action) return;
        e.preventDefault();

        // Close dropdown
        const profileBtn = document.getElementById('admin-profile-btn');
        const profileMenu = document.getElementById('admin-profile-dropdown');
        if (profileBtn && profileMenu) {
            profileBtn.setAttribute('aria-expanded', 'false');
            profileMenu.classList.remove('open');
        }

        switch (action) {
            case 'edit-profile': openEditProfileModal(); break;
            case 'change-password': openChangePasswordModal(); break;
            case 'audit-logs': loadAuditLogs(); break;
            case 'view-profile': openEditProfileModal(); break;
            case 'docs': cm_previewContent('documentation'); break;
            case 'help': cm_previewContent('help'); break;
            case 'content-editor': cm_openEditor('documentation'); break;
            default: showInfoAlert("Feature " + action + " coming soon!");
        }
    });
});

// =============================================
// CONTENT MANAGEMENT MODULE (v2)
// =============================================

const CM_PAGE_LABELS = {
    'help': { label: 'Help & Support', icon: 'fa-question-circle', color: '#3b82f6' },
    'documentation': { label: 'Documentation', icon: 'fa-book', color: '#8b5cf6' },
    'programs': { label: 'Programs', icon: 'fa-graduation-cap', color: '#10b981' },
    'resources': { label: 'Resources', icon: 'fa-folder-open', color: '#f59e0b' },
    'contact': { label: 'Contact Us', icon: 'fa-phone', color: '#06b6d4' },
    'privacy': { label: 'Privacy Policy', icon: 'fa-shield-alt', color: '#6b7280' },
    'learn-more': { label: 'Learn More (Hero)', icon: 'fa-info-circle', color: '#ec4899' },
    'terms': { label: 'Terms of Service', icon: 'fa-file-contract', color: '#f97316' }
};

let cmEditorQuill = null;
let cmCurrentKey = null;
let cmPages = [];
let cmEditorMode = 'quill'; // 'quill' or 'markdown'

async function loadContentManagement() {
    const grid = document.getElementById('cm-pages-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:0.75rem;">Loading...</p></div>';
    try {
        const res = await adminAPI.getAllContent();
        if (res.success) {
            cmPages = res.data;
            cm_renderPagesGrid(cmPages);
        } else {
            grid.innerHTML = '<p style="color:var(--text-muted);">Failed to load content pages.</p>';
        }
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--text-muted);">Error loading content pages.</p>';
    }
}

function cm_renderPagesGrid(pages) {
    const grid = document.getElementById('cm-pages-grid');
    if (!grid) return;

    const pagesByKey = {};
    pages.forEach(p => pagesByKey[p.key] = p);

    grid.innerHTML = Object.entries(CM_PAGE_LABELS).map(([key, meta]) => {
        const page = pagesByKey[key];
        const hasContent = page && page.content && page.content.trim().length > 10;
        const lastUpdated = page ? new Date(page.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never';
        const wordCount = page ? page.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length : 0;

        return "<div class='content-page-card' style='background:var(--bg-hover);border:1px solid var(--border-subtle);border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;gap:0.75rem;'>" +
            "<div style='display:flex;align-items:center;gap:0.75rem;'>" +
            "<div style='width:40px;height:40px;border-radius:10px;background:" + meta.color + "22;display:flex;align-items:center;justify-content:center;flex-shrink:0;'>" +
            "<i class='fas " + meta.icon + "' style='color:" + meta.color + ";'></i>" +
            "</div>" +
            "<div>" +
            "<h4 style='margin:0;font-size:0.9rem;'>" + meta.label + "</h4>" +
            "<span style='font-size:0.72rem;color:var(--text-muted);'>Key: <code>" + key + "</code></span>" +
            "</div>" +
            "<span style='margin-left:auto;font-size:0.7rem;padding:0.2rem 0.5rem;border-radius:20px;background:" + (hasContent ? '#d1fae5' : '#fef3c7') + ";color:" + (hasContent ? '#065f46' : '#92400e') + ";'>" + (hasContent ? '✓ Has content' : '⚠ Empty') + "</span>" +
            "</div>" +
            "<div style='font-size:0.78rem;color:var(--text-muted);display:flex;gap:1rem;'>" +
            "<span><i class='fas fa-clock'></i> " + lastUpdated + "</span>" +
            "<span><i class='fas fa-align-left'></i> ~" + wordCount + " words</span>" +
            "</div>" +
            "<div style='display:flex;gap:0.5rem;margin-top:0.25rem;'>" +
            "<button onclick=\"cm_openEditor('" + key + "')\" class='btn btn-primary' style='flex:1;font-size:0.8rem;padding:0.4rem;'><i class='fas fa-edit'></i> Edit</button>" +
            "<button onclick=\"cm_previewContent('" + key + "')\" class='btn btn-secondary' style='font-size:0.8rem;padding:0.4rem 0.75rem;'><i class='fas fa-eye'></i></button>" +
            "<button onclick=\"cm_clearContent('" + key + "')\" class='btn' style='font-size:0.8rem;padding:0.4rem 0.75rem;background:#fee2e2;color:#b91c1c;border:none;cursor:pointer;border-radius:8px;'><i class='fas fa-trash'></i></button>" +
            "</div>" +
            "</div>";
    }).join('');
}

window.cm_switchEditor = function (mode) {
    if (mode === cmEditorMode) return;
    cmEditorMode = mode;

    const quillWrapper = document.getElementById('cm-quill-editor-wrapper');
    const mdWrapper = document.getElementById('cm-markdown-editor-wrapper');
    const toggleQuill = document.getElementById('toggle-quill');
    const toggleMd = document.getElementById('toggle-markdown');

    if (mode === 'markdown') {
        const html = cmEditorQuill.root.innerHTML;
        // Simple HTML to MD (very basic, mostly for transitions)
        document.getElementById('cm-markdown-textarea').value = html
            .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
            .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n')
            .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
            .replace(/<ul>(.*?)<\/ul>/gs, (m, p1) => p1.replace(/<li>(.*?)<\/li>/g, '* $1\n'))
            .replace(/<ol>(.*?)<\/ol>/gs, (m, p1) => p1.replace(/<li>(.*?)<\/li>/g, '1. $1\n'))
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<[^>]+>/g, '');

        quillWrapper.style.display = 'none';
        mdWrapper.style.display = 'block';
        toggleQuill.classList.remove('active');
        toggleMd.classList.add('active');
    } else {
        // Markdown to HTML using marked
        const md = document.getElementById('cm-markdown-textarea').value;
        const html = typeof marked !== 'undefined' ? marked.parse(md) : md;
        cmEditorQuill.root.innerHTML = html;

        mdWrapper.style.display = 'none';
        quillWrapper.style.display = 'block';
        toggleMd.classList.remove('active');
        toggleQuill.classList.add('active');
    }
};

window.cm_openEditor = async function (key) {
    cmCurrentKey = key;
    const meta = CM_PAGE_LABELS[key] || { label: key, icon: 'fa-file', color: '#6b7280' };
    const modal = document.getElementById('cm-editor-modal');
    if (!modal) return;

    document.getElementById('cm-editor-title').textContent = 'Edit: ' + meta.label;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Default to Quill for legacy support
    cmEditorMode = 'quill';
    document.getElementById('cm-quill-editor-wrapper').style.display = 'block';
    document.getElementById('cm-markdown-editor-wrapper').style.display = 'none';
    document.getElementById('toggle-quill').classList.add('active');
    document.getElementById('toggle-markdown').classList.remove('active');

    if (!cmEditorQuill) {
        cmEditorQuill = new Quill('#cm-quill-container', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ color: [] }, { background: [] }],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'blockquote', 'code-block'],
                    ['clean']
                ]
            }
        });
    }

    document.getElementById('cm-editor-status').textContent = 'Loading content...';
    document.getElementById('cm-save-btn').disabled = true;
    try {
        const res = await adminAPI.getContent(key);
        if (res.success && res.data) {
            const content = res.data.content || '';
            cmEditorQuill.root.innerHTML = content;
            document.getElementById('cm-markdown-textarea').value = content;

            // Auto-detect if it's markdown (starts with # or has typical MD patterns but no HTML tags)
            const isMd = (content.includes('# ') || content.includes('**')) && !content.includes('<h');
            if (isMd) {
                cm_switchEditor('markdown');
            }

            document.getElementById('cm-editor-status').textContent = 'Last saved: ' + new Date(res.data.updated_at).toLocaleString();
        } else {
            cmEditorQuill.root.innerHTML = '';
            document.getElementById('cm-markdown-textarea').value = '';
            document.getElementById('cm-editor-status').textContent = 'No content yet. Start writing!';
        }
    } catch (e) {
        document.getElementById('cm-editor-status').textContent = 'Failed to load.';
    }
    document.getElementById('cm-save-btn').disabled = false;
};

window.cm_closeEditor = function () {
    const modal = document.getElementById('cm-editor-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.cm_saveContent = async function () {
    if (!cmCurrentKey) return;
    const content = cmEditorMode === 'markdown'
        ? document.getElementById('cm-markdown-textarea').value
        : cmEditorQuill.root.innerHTML;
    const saveBtn = document.getElementById('cm-save-btn');
    const statusEl = document.getElementById('cm-editor-status');
    saveBtn.disabled = true;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    try {
        const res = await adminAPI.updateContent(cmCurrentKey, content);
        if (res.success) {
            showSuccessAlert('Content saved successfully!');
            if (statusEl) statusEl.textContent = 'Last saved: ' + new Date(res.data.updated_at).toLocaleString();
            const updatedPage = cmPages.find(p => p.key === cmCurrentKey);
            if (updatedPage) { updatedPage.content = content; updatedPage.updated_at = res.data.updated_at; }
            else { cmPages.push(res.data); }
            cm_renderPagesGrid(cmPages);
        } else {
            showErrorAlert('Failed to save: ' + (res.error || 'Unknown error'));
        }
    } catch (e) {
        showErrorAlert('Save error.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
};

window.cm_clearContent = async function (key) {
    const label = CM_PAGE_LABELS[key]?.label || key;
    if (!confirm("Clear all content for \"" + label + "\"? This cannot be undone.")) return;
    try {
        const res = await adminAPI.deleteContent(key);
        if (res.success) {
            showSuccessAlert('Content cleared.');
            loadContentManagement();
        } else {
            showErrorAlert('Failed to clear: ' + (res.error || 'Unknown'));
        }
    } catch (e) {
        showErrorAlert('Error clearing content.');
    }
};

window.cm_previewContent = async function (key) {
    const meta = CM_PAGE_LABELS[key] || { label: key };
    try {
        const res = await adminAPI.getContent(key);
        if (res.success && res.data && res.data.content && res.data.content.trim()) {
            const htmlContent = res.data.content;
            const modal = document.getElementById('cm-preview-modal');
            document.getElementById('cm-preview-title').textContent = 'Preview: ' + meta.label;

            const previewBody = document.getElementById('cm-preview-body');
            // Basic markdown detection
            const isMarkdown = htmlContent.trim().startsWith('#') || htmlContent.includes('\n#');

            if (isMarkdown && typeof marked !== 'undefined') {
                const parsed = marked.parse(htmlContent);
                const clean = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(parsed) : parsed;
                previewBody.innerHTML = `<div class="markdown-body">${clean}</div>`;
            } else {
                const clean = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(htmlContent) : htmlContent;
                previewBody.innerHTML = clean;
            }

            document.getElementById('cm-preview-ts').textContent = 'Last updated: ' + new Date(res.data.updated_at).toLocaleString();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            showInfoAlert('This page has no content yet.', 3000);
        }
    } catch (e) {
        console.error('Preview error:', e);
        showErrorAlert('Could not load preview.');
    }
};

window.cm_closePreview = function () {
    const m = document.getElementById('cm-preview-modal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
};

window.cm_openNewContentModal = function () {
    showInfoAlert('All content pages are pre-created. Use Edit to modify any page.', 4000);
};

// Tab switch listener is handled by the central loadTabContent router.

export {
    populateERPFilters,
    loadDashboardData,
    loadUsers,
    loadStudents,
    loadMaterials,
    loadNotifications
};
/**
 * admin-dashboard.js
 * Full-featured admin dashboard with all CRUD operations restored.
 */

import { adminAPI, attendanceAPI, homeworkAPI, feesAPI, materialsAPI, notificationsAPI, resultsAPI, downloadFile, checkBackendHealth, waitForBackend } from '../../core/api.js';
import { requireRole, getUserId, syncToSessionStorage, logout as authLogout, hideProtectionScreen } from '../../core/auth-manager.js';
import './admin-pending-approvals.js';
import './exam-results.js';

// ═══════════════════════════════════════════
// ROUTE PROTECTION - Must be first
// ═══════════════════════════════════════════
if (!requireRole('admin')) {
  throw new Error('Unauthorized: Admin role required');
}

// Global logout handler
window.handleLogout = function() {
  // Admin logging out
  authLogout();
};

syncToSessionStorage('admin'); // Ensure sessionStorage is in sync
window.adminAPI = adminAPI; // Expose for debugging
window.resultsAPI = resultsAPI;

// Remove full-screen "Loading..." overlay as soon as this module runs (deferred modules execute
// after the document is parsed, so #auth-protection-screen already exists). Relying only on
// DOMContentLoaded misses bfcache restores and edge cases where the event already fired.
hideProtectionScreen();
window.addEventListener('pageshow', (e) => {
  if (e.persisted) hideProtectionScreen();
});


let currentTab = 'dashboard';
let allHomeworkData = [];
let allFeesData = [];
let currentEditHwId = null;
console.log('🚀 admin-dashboard.js loaded. Global state exposed.');

// =============================================
// INIT
// =============================================
async function initDashboard() {
    hideProtectionScreen();
    
    const adminId = getUserId();
    const adminRole = 'admin';
    const adminPhone = sessionStorage.getItem('adminPhone');

    if (!adminId) {
        console.error('❌ No admin ID found');
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

    // Check backend health before loading dashboard
    showInfoAlert('Checking backend connection...');
    const isBackendReady = await waitForBackend(3, 1000);
    
    if (!isBackendReady) {
        hideInfoAlert();
        showErrorAlert('❌ Backend server is not responding. Please ensure the backend server is running on port 3000.');
        console.error('Backend not available on localhost:3000');
        return;
    }
    
    hideInfoAlert();

    setupTabNavigation();
    setupForms();

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
            document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.remove('open'));
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
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminUserId');
            sessionStorage.removeItem('adminRole');
            sessionStorage.removeItem('adminPhone');
            window.location.href = '/admin-login.html';
        });
    }

    // Close profile dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const profileContainer = document.querySelector('.admin-profile-container');
        const dropdown = document.getElementById('profile-dropdown');
        if (profileContainer && dropdown && !profileContainer.contains(e.target)) {
            dropdown.classList.remove('active');
        }
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
        if (attachment) formData.append('attachment', attachment);
        
        const adminId = sessionStorage.getItem('adminUserId');
        if (adminId) formData.append('createdBy', adminId);

        try {
            showInfoAlert('Sending notice...');
            await notificationsAPI.create(formData);
            hideInfoAlert();
            closeNoticeModal();
            showSuccessAlert('✅ Notice sent with attachment!');
            await loadNotifications();
        } catch (err) {
            hideInfoAlert();
            showErrorAlert('Failed to send notice: ' + err.message);
        }
    });
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
    document.querySelectorAll('.sidebar nav a.nav-link').forEach(tab => {
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
    document.querySelectorAll('.sidebar nav a.nav-link').forEach(b => b.classList.remove('active'));

    const tab = document.getElementById(tabName) || document.getElementById('tab-' + tabName);
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }

    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');

    currentTab = tabName;
    loadTabContent(tabName);
}

async function loadTabContent(tabName) {
    switch (tabName) {
        case 'dashboard':          await loadDashboardData(); break;
        case 'pending-approvals':  await initPendingApprovalsTab(); break;
        case 'users':              await loadUsers(); break;
        case 'students':           await loadStudents(); break;
        case 'attendance':         await initAttendanceTab(); break;
        case 'homework':           await loadAllHomework(); break;
        case 'fees':               await initFeesTab(); break;
        case 'materials':          await loadMaterials(); break;
        case 'timetable':          await loadTimetable(); break;
        case 'notifications':      await loadNotifications(); break;
        case 'results':            await loadResults(); break;
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

window.dashboardData = dashboardData;
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
            const [studentsRes, unpaidFeesRes, financialRes, timetableRes, trendsRes, attendanceRes] = await Promise.all([
                adminAPI.getStudents().catch(() => ({ students: [] })),
                adminAPI.getUnpaidFees().catch(() => ({ fees: [] })),
                adminAPI.getFinancialSummary?.().catch(() => ({})) ?? Promise.resolve({}),
                adminAPI.getTimetable?.().catch(() => ({ timetable: [] })) ?? Promise.resolve({ timetable: [] }),
                // ✅ Fetch 30-day trend data with timeout
                fetchTrendDataSafe().catch(() => ({ trends: [], summary: {} })),
                // ✅ Fetch attendance statistics with timeout
                adminAPI.getAttendanceStats?.().catch(() => ({})) ?? Promise.resolve({})
            ]);

            // ✅ Store data with null-safe access
            dashboardData.students = studentsRes?.students || [];
            dashboardData.unpaidFees = unpaidFeesRes?.fees || [];
            // Extract report from nested structure if it exists
            dashboardData.financialSummary = (financialRes?.report) ? financialRes.report : (financialRes || {});
            dashboardData.timetable = timetableRes?.timetable || [];
            dashboardData.trends = trendsRes?.trends || [];
            dashboardData.attendanceStats = attendanceRes || {};

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
            try { renderQuickStatsKPI(); } catch (e) { console.warn('❌ KPI render error:', e); }
            try { renderFeesOverviewChart(); } catch (e) { console.warn('❌ Fees overview error:', e); }
            try { renderGrowthTrendChart(); } catch (e) { console.warn('❌ Growth trend error:', e); }
            try { renderFeesChart(); } catch (e) { console.warn('❌ Fees chart error:', e); }
            try { renderClassDistributionLineChart(); } catch (e) { console.warn('❌ Class distribution error:', e); }
            try { renderTrendChart(); } catch (e) { console.warn('❌ Trend chart error:', e); }
            try { renderActivityPanel(); } catch (e) { console.warn('❌ Activity panel error:', e); }
            try { renderUnpaidFeesTable(); } catch (e) { console.warn('❌ Unpaid fees table error:', e); }
            try { renderRecentStudents(); } catch (e) { console.warn('❌ Recent students error:', e); }
            try { renderTodayTimetable(); } catch (e) { console.warn('❌ Today timetable error:', e); }
        })();
        
        // Wait for dashboard load with timeout protection
        await Promise.race([loadDataPromise, dashboardTimeout]);
        
        hideInfoAlert();
        console.log('✅ Dashboard loaded successfully');

        // Setup auto-refresh: only refresh when this tab is active AND page is visible
        if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = setInterval(() => {
            if (currentTab === 'dashboard' && !document.hidden) {
                loadDashboardData();
            }
        }, 30000); // Refresh every 30 seconds

    } catch (err) {
        hideInfoAlert();
        console.error('❌ Failed to load dashboard data:', err);
        // Show dashboard anyway with empty data
        showErrorAlert(`⚠️ Dashboard data loading took too long or failed. Basic dashboard was shown. Error: ${err.message}`);
        
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
        console.warn('⚠️ Failed to fetch trend data:', error.message);
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
        if (res?.students && res.students.length > 0) {
            return res.students
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 3);
        }
        return [];
    } catch (err) {
        console.warn('⚠️ Error fetching latest students:', err.message);
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
        const fees = feesRes?.fees || [];
        
        // Filter paid fees and get latest 3
        return fees
            .filter(f => f?.isPaid === true)
            .sort((a, b) => new Date(b.paidDate || b.createdAt || 0) - new Date(a.paidDate || a.createdAt || 0))
            .slice(0, 3);
    } catch (err) {
        console.warn('⚠️ Error fetching latest payments:', err.message);
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
        const homework = res?.homework || [];
        
        // Get latest 3
        return homework
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 3);
    } catch (err) {
        console.warn('⚠️ Error fetching latest homework:', err.message);
        return [];
    }
}

// ===== RENDER FUNCTIONS =====

/**
 * Render Quick Stats KPI Cards - with improved error handling
 * Displays key performance indicators at the top of the dashboard
 */
function renderQuickStatsKPI() {
    try {
        const el = id => document.getElementById(id);
        
        // ✅ Null-safe data access
        const students = dashboardData?.students || [];
        const unpaidFees = dashboardData?.unpaidFees || [];
        const financials = dashboardData?.financialSummary || {};
        const attendanceStats = dashboardData?.attendanceStats || {};
        
        // Calculate metrics with null checks
        const totalStudents = students.length || 0;
        const activeStudents = students.filter(s => s?.status === 'active').length || 0;
        const inactiveStudents = totalStudents - activeStudents;

        // Financial data processed
        const totalCollected = financials.totalPaid ? parseFloat(financials.totalPaid) : 0;
        const totalPending = financials.totalPending ? parseFloat(financials.totalPending) : 0;
        const totalFees = totalCollected + totalPending;

        // Calculate overdue fees
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueData = unpaidFees.reduce((acc, f) => {
            if (!f?.dueDate || !f?.amount) return acc;
            const dueDate = new Date(f.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) {
                acc.count += 1;
                acc.amount += parseFloat(f.amount) || 0;
            }
            return acc;
        }, { count: 0, amount: 0 });

        // Calculate percentages
        const collectionPercentage = totalFees > 0 ? ((totalCollected / totalFees) * 100).toFixed(1) : 0;
        const pendingPercentage = totalFees > 0 ? ((totalPending / totalFees) * 100).toFixed(1) : 0;
        const activePercentage = totalStudents > 0 ? ((activeStudents / totalStudents) * 100).toFixed(1) : 0;
        const attendanceRate = attendanceStats.attendancePercent ? parseFloat(attendanceStats.attendancePercent).toFixed(1) : 0;

        // Helper function to format currency
        const formatCurrency = (amount) => {
            try {
                return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } catch (e) {
                return '₹0.00';
            }
        };

        // ✅ Safe DOM updates with null checks
        if (el('kpi-total-students')) {
            el('kpi-total-students').textContent = totalStudents || 0;
            if (el('kpi-total-students-detail')) {
                el('kpi-total-students-detail').textContent = `${activeStudents} active, ${inactiveStudents} inactive`;
            }
        }

        if (el('kpi-active-students')) {
            el('kpi-active-students').textContent = activeStudents || 0;
            if (el('kpi-active-percentage')) {
                el('kpi-active-percentage').textContent = `${activePercentage}% of total`;
            }
        }

        if (el('kpi-fees-collected')) {
            el('kpi-fees-collected').textContent = formatCurrency(totalCollected);
            if (el('kpi-collection-percentage')) {
                el('kpi-collection-percentage').textContent = `${collectionPercentage}% collected`;
            }
        }

        if (el('kpi-fees-pending')) {
            el('kpi-fees-pending').textContent = formatCurrency(totalPending);
            if (el('kpi-pending-percentage')) {
                el('kpi-pending-percentage').textContent = `${pendingPercentage}% pending`;
            }
        }

        if (el('kpi-fees-overdue')) {
            el('kpi-fees-overdue').textContent = formatCurrency(overdueData.amount);
            if (el('kpi-overdue-count')) {
                el('kpi-overdue-count').textContent = `${overdueData.count} students overdue`;
            }
        }

        if (el('kpi-attendance-rate')) {
            el('kpi-attendance-rate').textContent = `${attendanceRate || 0}%`;
            if (el('kpi-attendance-detail')) {
                el('kpi-attendance-detail').textContent = 'This month (avg.)';
            }
        }

        console.log('✅ Quick Stats rendered successfully');
    } catch (err) {
        console.error('❌ Error rendering quick stats KPI:', err);
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
    const paid = financials.totalPaid ? parseFloat(financials.totalPaid) : 0;
    const pending = financials.totalPending ? parseFloat(financials.totalPending) : 0;
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
                            label: function(context) {
                                return `₹${context.parsed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
                            label: function(context) {
                                return `Students: ${context.parsed.y}`;
                            },
                            afterLabel: function(context) {
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
        
        const collected = financials.totalPaid ? parseFloat(financials.totalPaid) : 0;
        const pending = financials.totalPending ? parseFloat(financials.totalPending) : 0;
        
        // Calculate overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = unpaidFees
            .filter(f => f?.dueDate)
            .reduce((sum, f) => {
                const dueDate = new Date(f.dueDate);
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
                        `Collected (₹${(collected / 100000).toFixed(1)}L)`,
                        `Pending (₹${(pending / 100000).toFixed(1)}L)`,
                        `Overdue (₹${(overdue / 100000).toFixed(1)}L)`
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
            console.log('✅ Fees overview chart rendered');
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
    const sorted = [...fees].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const topFees = sorted.slice(0, 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';
    topFees.forEach(fee => {
        const dueDate = new Date(fee.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        const overdueText = daysOverdue > 0 ? `${daysOverdue} days` : 'Due soon';
        const overdueClass = daysOverdue > 0 ? 'overdue' : '';

        html += `
            <tr>
                <td data-label="Name">${fee.studentName || '-'}</td>
                <td data-label="Class">${fee.classLevel || '-'}</td>
                <td data-label="Amount">₹${parseFloat(fee.amount || 0).toLocaleString('en-IN')}</td>
                <td data-label="Due Date">${new Date(fee.dueDate).toLocaleDateString('en-IN')}</td>
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

        // Format dates (group by week if too many data points)
        const labels = trendData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        });

        const amounts = trendData.map(d => parseFloat(d.amount) || 0);

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
                            label: function(context) {
                                return `₹${context.parsed.y.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
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
                subtitle: `₹${parseFloat(payment.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
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
        allUsersData = res.users || [];
        filterUsersTable();
    } catch (err) {
        showErrorAlert('Failed to load users');
    }
}

window.filterUsersTable = function() {
    const roleQ = document.getElementById('user-role-filter')?.value || '';
    const statQ = document.getElementById('user-status-filter')?.value || '';
    const textQ = (document.getElementById('user-search')?.value || '').toLowerCase();
    
    const filtered = allUsersData.filter(u => {
        const matchRole = roleQ ? u.role === roleQ : true;
        const matchStat = statQ ? (statQ === 'active' ? u.isActive : !u.isActive) : true;
        const matchText = textQ ? 
            (u.phone?.includes(textQ) || u.email?.toLowerCase().includes(textQ) || (u.name||'').toLowerCase().includes(textQ)) : true;
        return matchRole && matchStat && matchText;
    });

    renderUsersTable(filtered);
};

window.toggleShowAllUsers = function() {
    showAllUsers = !showAllUsers;
    filterUsersTable();
};

window.toggleAddUserForm = function() {
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

window.toggleUserActionsMenu = function(id, event) {
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
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
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
        <tr>
            <td>${index + 1}</td>
            <td><code>${u.teacherId || '-'}</code></td>
            <td><strong>${u.name || '-'}</strong></td>
            <td>${u.phone || '-'}</td>
            <td>${u.email || '-'}</td>
            <td>${u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : '-'}</td>
            <td><span class="status-badge ${u.status === 'active' ? 'status-active' : (u.status === 'pending' ? 'status-pending' : 'status-rejected')}">${u.status || (u.isActive ? 'active' : 'inactive')}</span></td>
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
                        <button class="action-menu-item danger" onclick="deleteUserById(${u.id}, '${u.name}')">
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

window.toggleUserMenu = function(event) {
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

window.closeAllUserMenus = function() {
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
        <div class="material-card">
            <div class="material-card-header" style="display:flex; align-items:center; gap:12px;">
                <div class="user-avatar" style="flex-shrink:0;">${initials}</div>
                <div class="user-info">
                    <h3 class="material-card-title" style="margin:0;">${u.name || 'User'}</h3>
                    <p class="user-email-text" style="font-size: 0.8rem;">${u.email || u.phone}</p>
                </div>
            </div>
            <div class="material-card-content" style="margin: 1rem 0;">
                <div class="material-card-meta">
                    <div class="material-card-meta-item">
                        <i class="fas fa-user-tag" style="color: var(--accent-blue);"></i>
                        <span>Role: <strong>${u.role}</strong></span>
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
                <button class="btn-table btn-delete" onclick="deleteUserById(${u.id})">
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
        // 1. Fetch available class levels
        const authStr = localStorage.getItem('auth');
        const auth = authStr ? JSON.parse(authStr) : {};
        const token = auth.token;
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://schoolapp-d9y5.onrender.com';
        
        const [classesRes, currentRes] = await Promise.all([
            fetch(`${baseUrl}/api/auth/admin/class-levels`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${baseUrl}/api/admin/users/${userId}/assignments`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const classesData = await classesRes.json();
        const currentData = await currentRes.json();

        if (classesData.success) {
            const availableClasses = classesData.classLevels || [];
            const currentAssignments = currentData.success ? (currentData.assignments || []) : [];

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
        allStudentsData = res.students || [];
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

window.filterStudentsTable = function() {
    const classQ = document.getElementById('student-class-filter')?.value || '';
    const secQ = document.getElementById('student-section-filter')?.value || '';
    const textQ = (document.getElementById('student-search')?.value || '').toLowerCase();
    
    const filtered = allStudentsData.filter(s => {
        const matchClass = classQ ? s.classLevel === classQ : true;
        const matchSec = secQ ? s.section === secQ : true;
        const matchText = textQ ? 
            ((s.name||'').toLowerCase().includes(textQ) || (s.phone||'').includes(textQ) || (s.id?.toString()||'').includes(textQ)) : true;
        return matchClass && matchSec && matchText;
    });

    renderStudentsTable(filtered);
};

window.toggleShowAllStudents = function() {
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
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
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
        <tr>
            <td><strong>${s.name}</strong></td>
            <td><code>${s.rollNumber || '-'}</code></td>
            <td>
                <div style="font-size: 0.8rem;">
                    <div>${s.fatherName || '-'}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">${s.motherName || ''}</div>
                </div>
            </td>
            <td>${s.phone || '-'}</td>
            <td>${s.classLevel || '-'}${s.section ? ' - ' + s.section : ''}</td>
            <td><span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-pending'}">${s.status}</span></td>
            <td>
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
                        <button class="action-menu-item danger" onclick="deleteStudentById(${s.id}, '${s.name}')">
                            <i class="fas fa-trash-alt" style="width: 16px;"></i> Delete Student
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

window.openAddStudentModal = function() {
    document.getElementById('add-student-modal').style.display = 'block';
    document.getElementById('add-student-form').reset();
    document.body.style.overflow = 'hidden';
};

window.closeAddStudentModal = function() {
    document.getElementById('add-student-modal').style.display = 'none';
    document.getElementById('add-student-form').reset();
    document.body.style.overflow = '';
};

window.openEditStudentModal = function(id) {
    const s = allStudentsData.find(st => st.id === id);
    if (!s) return;
    
    document.getElementById('edit-student-id').value = s.id;
    document.getElementById('edit-student-name').value = s.name || '';
    document.getElementById('edit-student-classLevel').value = s.classLevel || '';
    document.getElementById('edit-student-section').value = s.section || '';
    document.getElementById('edit-student-phone').value = s.phone || '';
    document.getElementById('edit-student-email').value = s.email || '';
    document.getElementById('edit-student-fatherName').value = s.fatherName || '';
    document.getElementById('edit-student-motherName').value = s.motherName || '';
    
    document.getElementById('edit-student-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    closeAllStudentMenus();
};

window.closeEditStudentModal = function() {
    document.getElementById('edit-student-modal').style.display = 'none';
    document.getElementById('edit-student-form').reset();
    document.body.style.overflow = '';
};

window.toggleStudentMenu = function(event) {
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

window.closeAllStudentMenus = function() {
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
async function initAttendanceTab() {
    try {
        const res = await attendanceAPI.getClasses();
        const classes = res.data || [];
        ['att-class-select', 'summary-class-select'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">-- Select Class --</option>';
            classes.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
        });
        const today = new Date().toISOString().split('T')[0];
        const dateEl = document.getElementById('att-date');
        if (dateEl) dateEl.value = today;
        const monthEl = document.getElementById('summary-month');
        if (monthEl) monthEl.value = today.slice(0, 7);
    } catch (err) {
        showErrorAlert('Failed to load attendance data');
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
                        <div class="att-student-name">${s.name}</div>
                        <div class="att-student-roll">Roll/ID: #${s.rollNumber || s.id}</div>
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
                        <td>${r.name}</td><td>${r.totalDays}</td>
                        <td>${r.presentCount}</td><td>${r.absentCount}</td><td>${r.lateCount}</td>
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
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><p>No homework found. Click "Add Homework" to get started.</p></td></tr>';
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
        return;
    }

    const displayLimit = 10;
    const toShow = showAllHomework ? list : list.slice(0, displayLimit);
    
    tbody.innerHTML = toShow.map((hw, i) => {
        const due = hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : '-';
        return `<tr>
            <td><strong>${hw.title}</strong></td>
            <td><span class="status-badge status-active">${hw.classLevel || hw.class_name}</span></td>
            <td>${hw.subject}</td>
            <td>${due}</td>
            <td>${hw.teacherPhone || '-'}</td>
            <td>
                <div class="action-menu">
                    <button class="action-menu-btn" onclick="toggleHomeworkMenu(event);">⋮</button>
                    <div class="action-menu-dropdown" data-hw-id="${hw.id}">
                        <button class="action-menu-item" onclick="openEditHomeworkModal(${hw.id})">
                            <i class="fas fa-pen" style="width: 16px;"></i> Edit
                        </button>
                        <div class="action-menu-divider"></div>
                        <button class="action-menu-item danger" onclick="deleteHomework(${hw.id})">
                            <i class="fas fa-trash" style="width: 16px;"></i> Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Show toggle button if more items exist
    if(toggleBtn) {
        toggleBtn.style.display = list.length > displayLimit ? 'block' : 'none';
        toggleBtn.textContent = showAllHomework ? 'Show Less' : `Show All Homework (${list.length})`;
    }
    if(countText) {
        countText.textContent = `Showing ${toShow.length} of ${list.length} homework items`;
    }
}

window.toggleShowAllHomework = function() {
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
    const id          = document.getElementById('hw-edit-id')?.value;
    const title       = document.getElementById('hw-title')?.value.trim();
    const classLevel  = document.getElementById('hw-class')?.value.trim();
    const subject     = document.getElementById('hw-subject')?.value.trim();
    const dueDate     = document.getElementById('hw-due-date')?.value;
    const description = document.getElementById('hw-description')?.value.trim();

    if (!title || !classLevel || !subject) {
        showErrorAlert('Title, Class and Subject are required');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('classLevel', classLevel);
    formData.append('subject', subject);
    formData.append('dueDate', dueDate);
    formData.append('description', description);
    formData.append('assignedBy', sessionStorage.getItem('adminUserId') || '');

    const fileInput = document.getElementById('hw-attachment');
    if (fileInput && fileInput.files[0]) {
        formData.append('attachment', fileInput.files[0]);
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

window.openAddFeeModal = function() {
    const modal = document.getElementById('add-fee-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('fee-student-id')?.focus();
    }
};

window.closeAddFeeModal = function() {
    const modal = document.getElementById('add-fee-modal');
    if (modal) modal.style.display = 'none';
};

window.toggleShowAllFees = function() {
    showAllFees = !showAllFees;
    debouncedFilterFees();
};

window.debouncedFilterFees = function() {
    clearTimeout(feesFilterTimeout);
    feesFilterTimeout = setTimeout(() => {
        const query = document.getElementById('fee-search')?.value.toLowerCase() || '';
        const filtered = allFeesData.filter(f => 
            (f.studentName || '').toLowerCase().includes(query) || 
            (f.student_id?.toString() || '').includes(query) ||
            (f.description || '').toLowerCase().includes(query)
        );
        renderFeesTable(filtered);
    }, 300);
};

async function initFeesTab() {
    try {
        await loadFeeStats();
        await loadFees('all');
    } catch (err) {
        showErrorAlert('Failed to load fees');
    }
}

async function loadFeeStats() {
    const res = await feesAPI.getStats();
    const s = res.data || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('fee-stat-collected',   `₹${(parseFloat(s.totalCollected) || 0).toFixed(2)}`);
    set('fee-stat-pending',     `₹${(parseFloat(s.totalPending)   || 0).toFixed(2)}`);
    set('fee-stat-paid-count',  s.paidCount   || 0);
    set('fee-stat-unpaid-count', s.unpaidCount || 0);
}

window.loadFees = async function(mode = 'all') {
    document.getElementById('fee-tab-all')?.classList.toggle('active',   mode === 'all');
    document.getElementById('fee-tab-unpaid')?.classList.toggle('active', mode === 'unpaid');

    try {
        const res  = mode === 'unpaid' ? await feesAPI.getUnpaid() : await feesAPI.getAll();
        allFeesData = res.data || [];
        renderFeesTable(allFeesData);
    } catch (err) {
        showErrorAlert('Failed to load fees');
    }
};

function renderFeesTable(fees) {
    const tbody = document.getElementById('fees-table-body');
    const toggleBtn = document.getElementById('btn-toggle-fees');
    const countText = document.getElementById('fees-count-text');
    if (!tbody) return;

    if (!fees.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No fee records found</td></tr>';
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
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

    tbody.innerHTML = toShow.map((f, i) => {
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${f.studentName || f.studentId}</strong></td>
                <td>${f.classLevel || '-'}</td>
                <td>₹${parseFloat(f.amount).toFixed(2)}</td>
                <td>${new Date(f.dueDate).toLocaleDateString('en-IN')}</td>
                <td><span class="badge ${f.paid ? 'badge-green' : 'badge-red'}">${f.paid ? 'Paid' : 'Unpaid'}</span></td>
                <td>
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

window.toggleFeeMenu = function(event) {
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
window.positionDropdown = function(btn, dropdown) {
    // Temporarily show to get height
    const originalDisplay = dropdown.style.display;
    dropdown.style.display = 'block';
    dropdown.style.visibility = 'hidden';
    
    const btnRect = btn.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = dropdown.offsetHeight || 160;
    
    // Restore display
    dropdown.style.display = originalDisplay;
    dropdown.style.visibility = '';
    
    const spaceBelow = viewportHeight - btnRect.bottom;
    const spaceAbove = btnRect.top;
    
    // Position below by default
    let top = btnRect.bottom + 5;
    let left = btnRect.right - 160; // Align to right
    
    // If not enough space below, flip to above
    if (spaceBelow < dropdownHeight + 20 && spaceAbove > dropdownHeight) {
        top = btnRect.top - dropdownHeight - 5;
    }
    
    // Prevent going off-screen horizontally
    if (left < 10) {
        left = 10;
    }
    if (left + 160 > window.innerWidth) {
        left = window.innerWidth - 170;
    }
    
    dropdown.style.position = 'fixed';
    dropdown.style.top = top + 'px';
    dropdown.style.left = left + 'px';
    dropdown.style.right = 'auto'; // Reset right if any
};

window.closeAllFeeMenus = function() {
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
};

window.saveFee = async function () {
    const studentId  = document.getElementById('fee-student-id')?.value;
    const amount     = document.getElementById('fee-amount')?.value;
    const dueDate    = document.getElementById('fee-due-date')?.value;
    const description = document.getElementById('fee-description')?.value.trim();

    if (!studentId || !amount || !dueDate) { showErrorAlert('Student ID, Amount and Due Date are required'); return; }
    
    showInfoAlert('Adding fee...');
    try {
        const res = await feesAPI.add({ studentId, amount, dueDate, description });
        if (res.data) {
            hideInfoAlert();
            showSuccessAlert('Fee record added!');
            closeAddFeeModal();
            ['fee-student-id', 'fee-amount', 'fee-due-date', 'fee-description'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            await initFeesTab();
        } else {
            hideInfoAlert();
            showErrorAlert(res.error || 'Failed to add fee');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert(err.message || 'Failed to add fee');
    }
};

window.toggleFeePaid = async function (id, markAsPaid) {
    showInfoAlert(markAsPaid ? 'Marking as paid...' : 'Marking as unpaid...');
    try {
        const res = markAsPaid ? await feesAPI.markPaid(id) : await feesAPI.markUnpaid(id);
        if (res.data) {
            hideInfoAlert();
            showSuccessAlert(markAsPaid ? 'Marked as Paid' : 'Marked as Unpaid');
            await initFeesTab();
        } else {
            hideInfoAlert();
            showErrorAlert('Failed to update status');
        }
    } catch (err) {
        hideInfoAlert();
        showErrorAlert('Failed to update fee status');
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
    const uniqueClasses = new Set(allMaterialsData.map(m => m.classLevel)).size;
    const uniqueSubjects = new Set(allMaterialsData.map(m => m.subject)).size;
    
    // Count materials uploaded this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekCount = allMaterialsData.filter(m => {
        const uploadDate = new Date(m.createdAt);
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
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
        return;
    }

    const displayLimit = 15;
    const toShow = showAllMaterials ? list : list.slice(0, displayLimit);
    
    tbody.innerHTML = toShow.map(m => `
        <tr>
            <td>
                <strong>${escapeHtml(m.title)}</strong>
                ${m.description ? `<br><small style="color: var(--text-muted);">${escapeHtml(m.description.substring(0, 50))}</small>` : ''}
            </td>
            <td>${escapeHtml(m.subject)}</td>
            <td><span class="badge">Class ${escapeHtml(m.classLevel)}</span></td>
            <td>${escapeHtml(m.uploadedBy || '-')}</td>
            <td><small style="color: var(--text-muted);">${formatDate(m.createdAt)}</small></td>
            <td>
                <div class="action-menu">
                    <button class="action-menu-btn" onclick="toggleMaterialMenu(event);">⋮</button>
                    <div class="action-menu-dropdown" data-material-id="${m.id}">
                        <button class="action-menu-item" onclick="downloadFile('${m.fileUrl}', '${escapeHtml(m.title)}.pdf')">
                            <i class="fas fa-download" style="width: 16px;"></i> Download
                        </button>
                        <button class="action-menu-item" onclick="openMaterialModal({id:${m.id},title:'${m.title.replace(/'/g, "\\'")}",description:'${(m.description || '').replace(/'/g, "\\'")}",subject:'${m.subject}',classLevel:'${m.classLevel}',fileUrl:'${m.fileUrl}'})">
                            <i class="fas fa-pen" style="width: 16px;"></i> Edit
                        </button>
                        <div class="action-menu-divider"></div>
                        <button class="action-menu-item danger" onclick="deleteMaterial(${m.id})">
                            <i class="fas fa-trash" style="width: 16px;"></i> Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    // Show toggle button if more items exist
    if(toggleBtn) {
        toggleBtn.style.display = list.length > displayLimit ? 'block' : 'none';
        toggleBtn.textContent = showAllMaterials ? 'Show Less' : `Show More Materials (${list.length})`;
    }
    if(countText) {
        countText.textContent = showAllMaterials ? '' : `Showing ${toShow.length} of ${list.length}`;
    }
}

window.toggleShowAllMaterials = function() {
    showAllMaterials = !showAllMaterials;
    renderMaterialsTable();
};

window.toggleMaterialMenu = function(event) {
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

window.closeAllMaterialMenus = function() {
    document.querySelectorAll('.action-menu-dropdown.active').forEach(d => d.classList.remove('active'));
};

function getFilteredMaterials() {
    const searchTerm = document.getElementById('material-search')?.value.toLowerCase() || '';
    const classFilter = document.getElementById('material-class-filter')?.value || '';
    const subjectFilter = document.getElementById('material-subject-filter')?.value || '';

    return allMaterialsData.filter(m => {
        const matchesSearch = !searchTerm || 
            m.title.toLowerCase().includes(searchTerm) || 
            m.subject.toLowerCase().includes(searchTerm) ||
            (m.description && m.description.toLowerCase().includes(searchTerm));
        
        const matchesClass = !classFilter || m.classLevel === classFilter;
        const matchesSubject = !subjectFilter || m.subject === subjectFilter;

        return matchesSearch && matchesClass && matchesSubject;
    });
}

window.filterMaterials = function() {
    renderMaterialsTable();
};

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.saveMaterial = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const id = document.getElementById('material-id')?.value;
    const title = document.getElementById('material-title')?.value;
    const description = document.getElementById('material-description')?.value;
    const subject = document.getElementById('material-subject')?.value;
    const classLevel = document.getElementById('material-class')?.value;
    const fileInput = document.getElementById('material-file');

    if (!title || !subject || !classLevel) {
        showErrorAlert('Please fill in all required fields (Title, Subject, Class)');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('subject', subject);
    formData.append('classLevel', classLevel);
    formData.append('uploadedBy', sessionStorage.getItem('adminName') || 'Admin');

    if (fileInput.files[0]) {
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
        await loadMaterials();
    } catch (err) {
        hideInfoAlert();
        console.error('Error saving material:', err);
        showErrorAlert('Error saving material: ' + err.message);
    }
};

window.deleteMaterial = async function(id) {
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

window.openMaterialModal = function(material = null) {
    const modal = document.getElementById('material-modal');
    const titleObj = document.getElementById('material-modal-title');
    const form = document.getElementById('material-form');
    const fileHint = document.getElementById('material-file-hint');
    const fileInput = document.getElementById('material-file');

    form.reset();
    fileHint.style.display = 'none';
    fileInput.required = true;

    if (material) {
        titleObj.innerText = 'Edit Study Material';
        document.getElementById('material-id').value = material.id;
        document.getElementById('material-title').value = material.title;
        document.getElementById('material-description').value = material.description || '';
        document.getElementById('material-subject').value = material.subject;
        document.getElementById('material-class').value = material.classLevel;
        fileHint.style.display = 'block';
        fileInput.required = false;
    } else {
        titleObj.innerText = 'Add Study Material';
        document.getElementById('material-id').value = '';
    }
    modal.style.display = 'flex';
    closeAllMaterialMenus();
};

window.closeMaterialModal = function() {
    document.getElementById('material-modal').style.display = 'none';
    document.getElementById('material-form').reset();
};

async function initMaterialsTab() {
    try {
        await loadMaterials();
    } catch (err) {
        showErrorAlert('Failed to load materials');
    }
}

// =============================================
// HOMEWORK - MODAL FUNCTIONS
// =============================================
window.openAddHomeworkModal = function() {
    document.getElementById('add-homework-modal').style.display = 'block';
    document.getElementById('homework-form').reset();
    document.getElementById('hw-edit-id').value = '';
    document.getElementById('hw-current-attachment').style.display = 'none';
    document.body.style.overflow = 'hidden';
};

window.closeAddHomeworkModal = function() {
    document.getElementById('add-homework-modal').style.display = 'none';
    document.getElementById('homework-form').reset();
    document.body.style.overflow = '';
};

window.openEditHomeworkModal = function(id) {
    const hw = allHomeworkData.find(h => h.id === id);
    if (!hw) return;
    
    // Populate form with homework data
    document.getElementById('hw-edit-id').value = hw.id;
    document.getElementById('hw-title').value = hw.title || '';
    document.getElementById('hw-class').value = hw.classLevel || '';
    document.getElementById('hw-subject').value = hw.subject || '';
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
    
    document.getElementById('add-homework-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    closeAllHomeworkMenus();
};

window.closeEditHomeworkModal = function() {
    document.getElementById('add-homework-modal').style.display = 'none';
    document.getElementById('homework-form').reset();
    document.getElementById('hw-edit-id').value = '';
    document.body.style.overflow = '';
};

window.toggleHomeworkMenu = function(event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const dropdown = btn.closest('.action-menu').querySelector('.action-menu-dropdown');
    
    // Close other menus
    closeAllHomeworkMenus();
    
    // Position and toggle current menu
    positionDropdown(btn, dropdown);
    dropdown.classList.add('open');
};

window.closeAllHomeworkMenus = function() {
    document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.remove('open'));
};

function setupForms() {
    const hwForm = document.getElementById('homework-form');
    if (hwForm) hwForm.addEventListener('submit', saveHomework);
    
    const matForm = document.getElementById('material-form');
    if (matForm) matForm.addEventListener('submit', saveMaterial);
    document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name:  document.getElementById('user-name')?.value.trim(),
            phone: document.getElementById('user-phone')?.value.trim(),
            email: document.getElementById('user-email')?.value.trim(),
            role:  document.getElementById('user-role')?.value,
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
            role:  role,
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
        const [yyyy, mm, dd] = dobRaw.split('-');
        const yy = yyyy.slice(2);
        const dateOfBirth = `${dd}/${mm}/${yy}`;

        const payload = {
            firstName,
            lastName,
            phone:       document.getElementById('student-phone')?.value,
            email:       email || null,
            classLevel:  document.getElementById('student-classLevel')?.value,
            section:     document.getElementById('student-section')?.value,
            fatherName:  document.getElementById('student-fatherName')?.value,
            motherName:  document.getElementById('student-motherName')?.value,
            dateOfBirth,
            joiningDate: new Date().toISOString().split('T')[0],
            status:      'active'
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
            name:        document.getElementById('edit-student-name')?.value,
            classLevel:  document.getElementById('edit-student-classLevel')?.value,
            section:     document.getElementById('edit-student-section')?.value,
            phone:       document.getElementById('edit-student-phone')?.value,
            email:       document.getElementById('edit-student-email')?.value,
            fatherName:  document.getElementById('edit-student-fatherName')?.value,
            motherName:  document.getElementById('edit-student-motherName')?.value,
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
function showErrorAlert(m)   { showAlert('error-alert', 'error-text', m); }
function showInfoAlert(m)    {
    const el = document.getElementById('info-alert');
    if (el) { document.getElementById('info-text').textContent = m || ''; el.style.display = 'flex'; }
}
function hideInfoAlert() {
    const el = document.getElementById('info-alert');
    if (el) el.style.display = 'none';
}

export { loadDashboardData, loadUsers, loadStudents, loadMaterials, loadResults, loadNotifications };

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
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No notifications sent yet. Click "Send Notice" to create one.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(n => {
            const date = new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const recipient = n.classLevel
                ? `Class ${n.classLevel}${n.recipientRole ? ' · ' + n.recipientRole : ''}`
                : (n.recipientRole || 'All Users');
            const fileHtml = n.attachmentUrl 
                ? `<a href="${n.attachmentUrl}" target="_blank" class="btn btn-xs btn-info"><i class="fas fa-file"></i> View</a>` 
                : '<span style="color:var(--text-muted)">-</span>';
            return `
                <tr>
                    <td>${date}</td>
                    <td><strong>${n.title}</strong></td>
                    <td style="max-width:250px; word-break:break-word;">${n.message}</td>
                    <td><span class="badge">${recipient}</span></td>
                    <td>${fileHtml}</td>
                    <td>
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

window.showSendNoticeModal = function() {
    const modal = document.getElementById('notice-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('notice-form')?.reset();
    }
};

window.closeNoticeModal = function() {
    const modal = document.getElementById('notice-modal');
    if (modal) modal.style.display = 'none';
};

window.deleteNotification = async function(id) {
    if (!confirm('Delete this notification?')) return;
    try {
        // The notifications controller doesn't have a DELETE — call the API directly
        await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
        showSuccessAlert('Notification deleted');
        await loadNotifications();
    } catch (err) {
        showErrorAlert('Failed to delete: ' + err.message);
    }
};


/**
 * MISSING TAB FUNCTIONS to prevent errors
 */

async function loadResults() {
    const list = document.getElementById('results-list');
    if (!list) return;
    try {
        showInfoAlert('Loading results...');
        const res = await resultsAPI.getAll();
        const items = res.data || [];
        hideInfoAlert();
        if (items.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="empty-state">No exam results recorded.</td></tr>';
            return;
        }
        list.innerHTML = items.map(r => `
            <tr>
                <td>${r.studentName || 'Student'}</td>
                <td>${r.exam_title}</td>
                <td>${r.subject}</td>
                <td>${r.marks_obtained}/${r.total_marks}</td>
                <td>${r.remarks || 'No remarks'}</td>
                <td>
                    <span style="color:var(--text-muted)">-</span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showErrorAlert('Failed to load results: ' + err.message);
    }
}

// =============================================
// TIMETABLE
// =============================================

// Modal functions
window.openAddTimetableModal = function() {
    const modal = document.getElementById('timetable-modal');
    if (modal) {
        document.getElementById('tt-id').value = '';
        document.getElementById('timetable-form').reset();
        modal.style.display = 'flex';
        loadTimetableDropdowns();
    }
};

window.closeTimetableModal = function() {
    const modal = document.getElementById('timetable-modal');
    if (modal) modal.style.display = 'none';
    document.getElementById('timetable-form').reset();
};

window.toggleTimetableMenu = function(event, id) {
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

window.closeAllTimetableMenus = function() {
    document.querySelectorAll('[id^="tt-menu-"]').forEach(m => m.classList.remove('open'));
};

let allTeachersForTimetable = [];

async function loadTimetableDropdowns() {
    try {
        const [classesRes, usersRes] = await Promise.all([
            attendanceAPI.getClasses(),
            adminAPI.getUsers()
        ]);

        // Populate Class Dropdown
        const classes = classesRes.data || [];
        const classSel = document.getElementById('tt-class');
        if (classSel) {
            classSel.innerHTML = '<option value="">Select Class</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        // Store teachers globally for filtering
        allTeachersForTimetable = (usersRes.users || []).filter(u => u.role === 'teacher' && u.isActive);
        
        const teacherSel = document.getElementById('tt-teacher');
        
        // Initial populate: all teachers or disabled until class is selected
        if (teacherSel) {
            teacherSel.innerHTML = '<option value="">Select Class First</option>';
            teacherSel.disabled = true;
        }

        // Add event listener to filter teachers when class is selected
        if (classSel) {
            classSel.addEventListener('change', function() {
                const selectedClass = this.value;
                if (!selectedClass) {
                    teacherSel.innerHTML = '<option value="">Select Class First</option>';
                    teacherSel.disabled = true;
                    return;
                }

                // Filter teachers who have the selected class in their classesAssigned array
                const availableTeachers = allTeachersForTimetable.filter(t => {
                    if (!t.classesAssigned || t.classesAssigned.length === 0) return false;
                    return t.classesAssigned.includes(selectedClass);
                });

                if (availableTeachers.length > 0) {
                    teacherSel.disabled = false;
                    teacherSel.innerHTML = '<option value="">Select Teacher</option>' + 
                        availableTeachers.map(t => `<option value="${t.id}">${t.name || t.phone}</option>`).join('');
                } else {
                    teacherSel.disabled = true;
                    teacherSel.innerHTML = '<option value="">No Teacher Available</option>';
                }
            });
        }
    } catch (err) {
        console.error('Failed to load dropdowns:', err);
    }
}

window.saveTimetableEntry = async function() {
    const ttId = document.getElementById('tt-id')?.value;
    const payload = {
        dayOfWeek: document.getElementById('tt-day')?.value,
        startTime: document.getElementById('tt-start')?.value,
        endTime: document.getElementById('tt-end')?.value,
        subject: document.getElementById('tt-subject')?.value.trim(),
        classLevel: document.getElementById('tt-class')?.value,
        section: document.getElementById('tt-section')?.value || null,
        teacherId: document.getElementById('tt-teacher')?.value,
    };

    if (!payload.dayOfWeek || !payload.startTime || !payload.endTime || !payload.subject || !payload.classLevel || !payload.teacherId) {
        showErrorAlert('All fields are required.');
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
    } catch(e) { 
        return t; 
    }
}

// Select a day and render its timetable
window.selectTimetableDay = function(day) {
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
                            <td data-label="Time">${displayTime}</td>
                            <td data-label="Subject">${entry.subject}</td>
                            <td data-label="Teacher">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span>${teacherName}</span>
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

window.deleteTimetableRecord = async function(id) {
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

window.openAddUserModal = function() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.style.display = 'flex';
};

window.closeAddUserModal = function() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.style.display = 'none';
};

window.openEditUserModal = function() {
    const modal = document.getElementById('editUserModal');
    if (modal) modal.style.display = 'flex';
};

window.closeEditUserModal = function() {
    const modal = document.getElementById('editUserModal');
    if (modal) modal.style.display = 'none';
};

window.toggleUserActionMenu = function(event, id) {
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

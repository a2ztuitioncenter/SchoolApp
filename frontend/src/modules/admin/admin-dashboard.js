/**
 * admin-dashboard.js
 * Full-featured admin dashboard with all CRUD operations restored.
 */

import { adminAPI, attendanceAPI, homeworkAPI, feesAPI, materialsAPI, notificationsAPI, resultsAPI, downloadFile, checkBackendHealth, waitForBackend } from '../../core/api.js';


let currentTab = 'dashboard';
let allHomeworkData = [];
let allFeesData = [];
let currentEditHwId = null;

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    const adminId = sessionStorage.getItem('adminUserId');
    const adminRole = sessionStorage.getItem('adminRole');

    if (!adminId || adminRole !== 'admin') {
        window.location.href = '/admin-login.html';
        return;
    }

    const adminPhone = sessionStorage.getItem('adminPhone');
    
    // Set up GitHub-style profile menu
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
        
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileBtn.setAttribute('aria-expanded', 'false');
                profileMenu.classList.remove('open');
            }
        });
    }

    const dropLogoutBtn = document.getElementById('dropdown-logout-btn');
    if (dropLogoutBtn) {
        dropLogoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = '/admin-login.html';
        });
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

    // Wire up Timetable form
    document.getElementById('timetable-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            dayOfWeek: document.getElementById('tt-day')?.value,
            startTime: document.getElementById('tt-start')?.value,
            endTime: document.getElementById('tt-end')?.value,
            subject: document.getElementById('tt-subject')?.value.trim(),
            classLevel: document.getElementById('tt-class')?.value,
            teacherId: document.getElementById('tt-teacher')?.value,
        };

        if (!payload.dayOfWeek || !payload.startTime || !payload.endTime || !payload.subject || !payload.classLevel || !payload.teacherId) {
            showErrorAlert('All fields are required.');
            return;
        }

        try {
            showInfoAlert('Saving timetable entry...');
            await adminAPI.addTimetable(payload);
            hideInfoAlert();
            showSuccessAlert('Timetable entry saved successfully!');
            document.getElementById('timetable-form').reset();
            await loadTimetable();
        } catch (err) {
            hideInfoAlert();
            showErrorAlert(err.message || 'Failed to save timetable entry');
        }
    });

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
});

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
        case 'dashboard':     await loadDashboardData(); break;
        case 'users':         await loadUsers(); break;
        case 'students':      await loadStudents(); break;
        case 'attendance':    await initAttendanceTab(); break;
        case 'homework':      await loadAllHomework(); break;
        case 'fees':          await initFeesTab(); break;
        case 'materials':     await loadMaterials(); break;
        case 'timetable':     await loadTimetable(); break;
        case 'notifications': await loadNotifications(); break;
        case 'results':       await loadResults(); break;
    }
}

window.showTab = showTab;


// =============================================
// DASHBOARD
// =============================================
async function loadDashboardData() {
    try {
        const [studentsRes, feesRes] = await Promise.all([
            adminAPI.getStudents().catch(() => ({ students: [] })),
            adminAPI.getUnpaidFees().catch(() => ({ fees: [] }))
        ]);

        const el = id => document.getElementById(id);
        const totalStudents = (studentsRes.students || []).length;
        if (el('total-students')) el('total-students').textContent = totalStudents;

        const unpaidList = feesRes.fees || [];
        const totalUnpaid = unpaidList.reduce((s, f) => s + parseFloat(f.amount || 0), 0);
        if (el('total-unpaid')) el('total-unpaid').textContent = `₹${totalUnpaid.toLocaleString()}`;

        const today = new Date();
        const overdue = unpaidList.filter(f => new Date(f.dueDate) < today).length;
        if (el('overdue-count')) el('overdue-count').textContent = overdue;
    } catch (err) {
        console.error('Failed to load dashboard data', err);
    }
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
    if (!e.target.closest('.table-actions')) {
        document.querySelectorAll('.actions-dropdown-menu.active').forEach(menu => {
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
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No users matching criteria.</td></tr>';
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
        return;
    }

    const displayLimit = 5;
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

    tbody.innerHTML = toShow.map(u => {
        const roleColors = {
            teacher: 'background:#d6eaf8;color:#154360',
            staff: 'background:#d5f5e3;color:#145a32',
            admin: 'background:#fadbd8;color:#78281f',
        };
        const roleBadgeStyle = roleColors[u.role] || 'background:#eee;color:#333';
        return `
        <tr>
            <td>${u.phone}</td>
            <td>${u.email || '<span style="color:#aaa">—</span>'}</td>
            <td><span class="status-badge" style="${roleBadgeStyle}">${u.role}</span></td>
            <td><span class="status-badge ${u.isActive ? 'status-active' : 'status-pending'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-actions-toggle" onclick="toggleUserActionsMenu(${u.id}, event)">⋮</button>
                    <div class="actions-dropdown-menu" id="user-actions-${u.id}">
                        <button class="actions-dropdown-item" onclick="editUser(${u.id})">
                            <i class="fas fa-pen"></i> Edit User
                        </button>
                        <button class="actions-dropdown-item" onclick="toggleUserStatusById(${u.id}, ${!u.isActive})">
                            <i class="fas fa-${u.isActive ? 'ban' : 'check'}"></i> ${u.isActive ? 'Disable User' : 'Enable User'}
                        </button>
                        <button class="actions-dropdown-item danger" onclick="deleteUserById(${u.id})">
                            <i class="fas fa-trash"></i> Delete User
                        </button>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.editUser = function (id) {
    const user = allUsersData.find(u => u.id === id);
    if (!user) return;
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-phone').value = user.phone || '';
    document.getElementById('edit-user-email').value = user.email || '';
    document.getElementById('edit-user-role').value = user.role || 'teacher';
    document.getElementById('edit-user-section').style.display = 'grid';
    document.getElementById('edit-user-section').scrollIntoView({ behavior: 'smooth' });
};

window.cancelEditUser = function () {
    document.getElementById('edit-user-section').style.display = 'none';
    document.getElementById('edit-user-form').reset();
};

window.deleteUserById = async function (id) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
        const res = await adminAPI.deleteUser(id);
        if (res.success) {
            showSuccessAlert('User deleted successfully');
            await loadUsers();
        } else {
            showErrorAlert(res.error || 'Failed to delete user');
        }
    } catch (err) {
        showErrorAlert(err.message || 'Failed to delete user');
    }
};

window.toggleUserStatusById = async function (id, isActive) {
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
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No students found. Add one below.</td></tr>';
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
        return;
    }

    const displayLimit = 5;
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
            <td><strong>${s.id}</strong></td>
            <td>${s.name}</td>
            <td>${s.phone || 'N/A'}</td>
            <td>${s.classLevel || 'N/A'}${s.section ? ' - ' + s.section : ''}</td>
            <td><span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-pending'}">${s.status}</span></td>
            <td>
                <button class="btn-sm btn-edit" onclick="editStudent(${s.id})"><i class="fas fa-pen"></i> Edit</button>
                <button class="btn-sm ${s.status === 'active' ? 'btn-warning' : 'btn-success'}" onclick="toggleStudentStatusById(${s.id}, '${s.status === 'active' ? 'inactive' : 'active'}')">
                    <i class="fas fa-${s.status === 'active' ? 'ban' : 'check'}"></i> ${s.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button class="btn-sm btn-delete" onclick="deleteStudentById(${s.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.editStudent = function (id) {
    const s = allStudentsData.find(st => st.id === id);
    if (!s) return;
    document.getElementById('edit-student-id').value = s.id;
    document.getElementById('edit-student-name').value = s.name || '';
    document.getElementById('edit-student-classLevel').value = s.classLevel || '';
    document.getElementById('edit-student-section').value = s.section || '';
    document.getElementById('edit-student-phone').value = s.phone || '';
    document.getElementById('edit-student-email').value = s.email || '';
    document.getElementById('edit-student-fatherName').value = s.fatherName || '';
    const section = document.getElementById('edit-student-section');
    if (section) { section.style.display = 'grid'; section.scrollIntoView({ behavior: 'smooth' }); }
    document.getElementById('edit-student-section').style.display = 'grid';
    document.getElementById('edit-student-section').scrollIntoView({ behavior: 'smooth' });
};

window.cancelEditStudent = function () {
    document.getElementById('edit-student-section').style.display = 'none';
    document.getElementById('edit-student-form').reset();
};

window.deleteStudentById = async function (id) {
    if (!confirm('Delete this student? This will remove all their records.')) return;
    try {
        const res = await adminAPI.deleteStudent(id);
        if (res.success) { showSuccessAlert('Student deleted'); await loadStudents(); }
        else showErrorAlert(res.error || 'Failed to delete student');
    } catch (err) {
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

window.loadAttendanceSheet = async function () {
    const classLevel = document.getElementById('att-class-select').value;
    const date = document.getElementById('att-date').value;
    if (!classLevel || !date) { showErrorAlert('Select a class and date'); return; }

    try {
        const [studRes, attRes] = await Promise.all([
            attendanceAPI.getStudentsByClass(classLevel),
            attendanceAPI.getByClassAndDate(classLevel, date)
        ]);
        const students = studRes.data || [];
        const existing = {};
        (attRes.data || []).forEach(a => { existing[a.studentId] = a.status; });

        const tbody = document.getElementById('att-sheet-body');
        if (!tbody) return;
        tbody.innerHTML = students.length ? students.map(s => `
            <tr>
                <td>${s.rollNumber || '-'}</td>
                <td>${s.name}</td>
                <td><input type="radio" name="att-${s.id}" value="present" ${(existing[s.id] || 'present') === 'present' ? 'checked' : ''}> Present</td>
                <td><input type="radio" name="att-${s.id}" value="absent" ${existing[s.id] === 'absent' ? 'checked' : ''}> Absent</td>
                <td><input type="radio" name="att-${s.id}" value="late" ${existing[s.id] === 'late' ? 'checked' : ''}> Late</td>
            </tr>
        `).join('') : '<tr><td colspan="5">No students found in this class</td></tr>';
        document.getElementById('attendance-sheet').style.display = 'block';
    } catch (err) {
        showErrorAlert('Failed to load attendance sheet');
    }
};

window.submitAttendance = async function () {
    const classLevel = document.getElementById('att-class-select').value;
    const date = document.getElementById('att-date').value;
    const records = [];

    document.querySelectorAll('#att-sheet-body tr').forEach(row => {
        const checked = row.querySelector('input[type="radio"]:checked');
        if (checked) {
            records.push({
                studentId: parseInt(checked.name.replace('att-', '')),
                classLevel,
                date,
                status: checked.value
            });
        }
    });
    if (!records.length) { showErrorAlert('No attendance data to save'); return; }
    try {
        const res = await attendanceAPI.markBulk(records);
        showSuccessAlert(res.message || 'Attendance saved');
    } catch (err) {
        showErrorAlert('Failed to save attendance');
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
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No homework found. Add one below.</td></tr>';
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
        return;
    }

    const displayLimit = 10;
    const toShow = showAllHomework ? list : list.slice(0, displayLimit);
    
    tbody.innerHTML = toShow.map((hw, i) => {
        const due = hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : '-';
        return `<tr>
            <td>${i + 1}</td>
            <td>${hw.title}</td>
            <td><span class="badge">${hw.classLevel || hw.class_name}</span></td>
            <td>${hw.subject}</td>
            <td>${due}</td>
            <td>${hw.teacherPhone || '-'}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="editHomework(${hw.id})">Edit</button>
                <button class="btn-sm btn-delete" onclick="deleteHomework(${hw.id})">Delete</button>
            </td>
        </tr>`;
    }).join('');

    // Show toggle button if more items exist
    if(toggleBtn) {
        toggleBtn.style.display = list.length > displayLimit ? 'block' : 'none';
        toggleBtn.textContent = showAllHomework ? 'Show Less Homework' : `Show More Homework (${list.length})`;
    }
    if(countText) {
        countText.textContent = showAllHomework ? '' : `Showing ${toShow.length} of ${list.length}`;
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
        const res = id
            ? await homeworkAPI.update(id, formData)
            : await homeworkAPI.create(formData);
        if (res.data) {
            showSuccessAlert(id ? 'Homework updated!' : 'Homework added!');
            resetHomeworkForm();
            await loadAllHomework();
        } else {
            showErrorAlert(res.error || 'Failed to save homework');
        }
    } catch (err) {
        showErrorAlert(err.message || 'Failed to save homework');
    }
};

window.editHomework = function (id) {
    const hw = allHomeworkData.find(h => h.id === id);
    if (!hw) return;
    document.getElementById('hw-edit-id').value = hw.id;
    document.getElementById('hw-title').value   = hw.title;
    document.getElementById('hw-class').value   = hw.classLevel || hw.class_name;
    document.getElementById('hw-subject').value = hw.subject;
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

    const titleEl = document.getElementById('hw-form-title');
    if (titleEl) titleEl.textContent = 'Edit Homework';
    document.getElementById('hw-title').scrollIntoView({ behavior: 'smooth' });
};

window.deleteHomework = async function (id) {
    if (!confirm('Delete this homework?')) return;
    try {
        const res = await homeworkAPI.delete(id);
        if (res.message) {
            showSuccessAlert('Homework deleted');
            await loadAllHomework();
        } else {
            showErrorAlert('Failed to delete');
        }
    } catch (err) {
        showErrorAlert(err.message || 'Failed to delete');
    }
};

window.resetHomeworkForm = resetHomeworkForm;
function resetHomeworkForm() {
    ['hw-edit-id', 'hw-title', 'hw-class', 'hw-subject', 'hw-due-date', 'hw-description', 'hw-attachment'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const attachInfo = document.getElementById('hw-current-attachment');
    if (attachInfo) attachInfo.style.display = 'none';

    const titleEl = document.getElementById('hw-form-title');
    if (titleEl) titleEl.textContent = 'Add Homework';
    currentEditHwId = null;
}

// =============================================
// FEES - FULL CRUD
// =============================================
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

window.loadFees = loadFees;
async function loadFees(mode = 'all') {
    document.getElementById('fee-tab-all')?.classList.toggle('active',   mode === 'all');
    document.getElementById('fee-tab-unpaid')?.classList.toggle('active', mode === 'unpaid');

    try {
        const res  = mode === 'unpaid' ? await feesAPI.getUnpaid() : await feesAPI.getAll();
        allFeesData = res.data || [];
        renderFeesTable(allFeesData);
    } catch (err) {
        showErrorAlert('Failed to load fees');
    }
}

let showAllFees = false;

window.toggleShowAllFees = function() {
    showAllFees = !showAllFees;
    filterFeesTable(); // re-runs slicing logic
};

function renderFeesTable(fees) {
    const tbody = document.getElementById('fees-table-body');
    const toggleBtn = document.getElementById('btn-toggle-fees');
    const countText = document.getElementById('fees-count-text');
    if (!tbody) return;

    if (!fees.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No fee records found</td></tr>';
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
        return;
    }

    const displayLimit = 5;
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

    tbody.innerHTML = toShow.map((f, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${f.studentName || f.studentId}</strong>${f.student_id ? `<br><small style="color:#636e72">ID: ${f.student_id}</small>` : ''}</td>
            <td>${f.classLevel || '-'}</td>
            <td>₹${parseFloat(f.amount).toFixed(2)}</td>
            <td>${f.description || '-'}</td>
            <td>${new Date(f.dueDate).toLocaleDateString('en-IN')}</td>
            <td><span class="badge ${f.paid ? 'badge-green' : 'badge-red'}">${f.paid ? 'Paid' : 'Unpaid'}</span></td>
            <td>
                <button class="btn-sm ${f.paid ? 'btn-warning' : 'btn-success'}" onclick="toggleFeePaid(${f.id}, ${!f.paid})">
                    ${f.paid ? 'Mark Unpaid' : 'Mark Paid'}
                </button>
                <button class="btn-sm btn-delete" onclick="deleteFeeRecord(${f.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.filterFeesTable = function() {
    const query = document.getElementById('fee-search')?.value.toLowerCase() || '';
    const filtered = allFeesData.filter(f => 
        (f.studentName || '').toLowerCase().includes(query) || 
        (f.student_id?.toString() || '').includes(query) ||
        (f.description || '').toLowerCase().includes(query)
    );
    renderFeesTable(filtered);
};


window.addFeeRecord = async function () {
    const studentId  = document.getElementById('fee-student-id')?.value;
    const amount     = document.getElementById('fee-amount')?.value;
    const dueDate    = document.getElementById('fee-due-date')?.value;
    const description = document.getElementById('fee-description')?.value.trim();

    if (!studentId || !amount || !dueDate) { showErrorAlert('Student ID, Amount and Due Date are required'); return; }
    try {
        const res = await feesAPI.add({ studentId, amount, dueDate, description });
        if (res.data) {
            showSuccessAlert('Fee record added!');
            ['fee-student-id', 'fee-amount', 'fee-due-date', 'fee-description'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            await initFeesTab();
        } else {
            showErrorAlert(res.error || 'Failed to add fee');
        }
    } catch (err) {
        showErrorAlert(err.message || 'Failed to add fee');
    }
};

window.toggleFeePaid = async function (id, markAsPaid) {
    try {
        const res = markAsPaid ? await feesAPI.markPaid(id) : await feesAPI.markUnpaid(id);
        if (res.data) {
            showSuccessAlert(markAsPaid ? 'Marked as Paid' : 'Marked as Unpaid');
            await initFeesTab();
        }
    } catch (err) {
        showErrorAlert('Failed to update fee status');
    }
};

window.deleteFeeRecord = async function (id) {
    if (!confirm('Delete this fee record?')) return;
    try {
        const res = await feesAPI.delete(id);
        if (res.message) { showSuccessAlert('Fee deleted'); await initFeesTab(); }
        else showErrorAlert('Failed to delete');
    } catch (err) {
        showErrorAlert(err.message || 'Failed to delete');
    }
};

// =============================================
// MATERIALS
// =============================================

let allMaterialsData = [];
let showAllMaterials = false;

async function loadMaterials() {
    try {
        showAllMaterials = false; // Reset pagination when loading fresh data
        const res = await materialsAPI.getAll();
        allMaterialsData = res.data || [];
        
        // Update stats
        updateMaterialsStats();
        
        // Render table and mobile view
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

    const displayLimit = 10;
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
            <td>
                <small style="color: var(--text-muted);">${formatDate(m.createdAt)}</small>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-table btn-download" onclick="downloadFile('${m.fileUrl}', '${m.title}.pdf')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-table btn-edit" onclick='openMaterialModal(${JSON.stringify(m).replace(/'/g, "&#39;")})' title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table btn-delete" onclick="deleteMaterial(${m.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Show toggle button if more items exist
    if(toggleBtn) {
        toggleBtn.style.display = list.length > displayLimit ? 'block' : 'none';
        toggleBtn.textContent = showAllMaterials ? 'Show Less Materials' : `Show More Materials (${list.length})`;
    }
    if(countText) {
        countText.textContent = showAllMaterials ? '' : `Showing ${toShow.length} of ${list.length}`;
    }

    // Render mobile cards
    renderMaterialsCards(toShow);
}

window.toggleShowAllMaterials = function() {
    showAllMaterials = !showAllMaterials;
    renderMaterialsTable();
};

function renderMaterialsCards(list) {
    const cardsContainer = document.getElementById('materials-cards');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = list.length ? list.map(m => `
        <div class="material-card">
            <div class="material-card-header">
                <h3 class="material-card-title">${escapeHtml(m.title)}</h3>
            </div>
            <div class="material-card-content">
                ${m.description ? `<p style="margin: 0 0 0.75rem; font-size: 0.9rem; color: var(--text-muted);">${escapeHtml(m.description)}</p>` : ''}
                <div class="material-card-meta">
                    <div class="material-card-meta-item">
                        <i class="fas fa-book-open" style="color: var(--accent-blue);"></i>
                        <span><strong>${escapeHtml(m.subject)}</strong></span>
                    </div>
                    <div class="material-card-meta-item">
                        <i class="fas fa-chalkboard" style="color: var(--success);"></i>
                        <span>Class <strong>${escapeHtml(m.classLevel)}</strong></span>
                    </div>
                    <div class="material-card-meta-item" style="grid-column: 1 / -1;">
                        <i class="fas fa-user" style="color: var(--warning);"></i>
                        <span><strong>${escapeHtml(m.uploadedBy || 'Unknown')}</strong></span>
                    </div>
                    <div class="material-card-meta-item" style="grid-column: 1 / -1;">
                        <i class="fas fa-calendar" style="color: var(--text-muted);"></i>
                        <span>${formatDate(m.createdAt)}</span>
                    </div>
                </div>
            </div>
            <div class="material-card-actions">
                <button class="btn-table btn-download" onclick="downloadFile('${m.fileUrl}', '${m.title}.pdf')" title="Download">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn-table btn-edit" onclick='openMaterialModal(${JSON.stringify(m).replace(/'/g, "&#39;")})' title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-table btn-delete" onclick="deleteMaterial(${m.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('') : '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No materials found</p>';
}

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
    console.log('📝 Saving material...');
    
    const id = document.getElementById('material-id').value;
    const title = document.getElementById('material-title').value;
    const description = document.getElementById('material-description').value;
    const subject = document.getElementById('material-subject').value;
    const classLevel = document.getElementById('material-class').value;
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

    try {
        let res;
        if (id) {
            console.log(`📤 Updating material ID: ${id}`);
            res = await materialsAPI.update(id, formData);
            showSuccessAlert('Material updated successfully');
        } else {
            console.log('📤 Creating new material...');
            res = await materialsAPI.create(formData);
            showSuccessAlert('Material uploaded successfully');
        }
        closeMaterialModal();
        loadMaterials();
    } catch (err) {
        console.error('❌ Error saving material:', err);
        showErrorAlert('Error saving material: ' + err.message);
    }
};

async function deleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
        await materialsAPI.delete(id);
        showSuccessAlert('Material deleted'); // Changed showToast to showSuccessAlert
        loadMaterials();
    } catch (err) {
        showErrorAlert('Error deleting: ' + err.message); // Changed alert to showErrorAlert
    }
}

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
    modal.style.display = 'block';
};

window.closeMaterialModal = function() {
    document.getElementById('material-modal').style.display = 'none';
};

window.deleteMaterial = deleteMaterial;

// =============================================
// FORM SETUP (Add User / Add Student / Logout)
// =============================================
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
            showErrorAlert('Name, Phone, Role, and Password are required');
            return;
        }
        try {
            console.log('📤 Adding user:', payload.phone);
            showInfoAlert('Adding user...');
            const res = await adminAPI.addUser(payload);
            hideInfoAlert();
            if (res.success) { 
                showSuccessAlert('User added!'); 
                document.getElementById('add-user-form').reset();
                await loadUsers(); 
            }
            else showErrorAlert(res.error || 'Failed to add user');
        } catch (err) { 
            hideInfoAlert();
            console.error('Error adding user:', err);
            showErrorAlert(err.message || 'Failed to add user'); 
        }
    });

    document.getElementById('edit-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id')?.value;
        const payload = {
            phone: document.getElementById('edit-user-phone')?.value,
            email: document.getElementById('edit-user-email')?.value,
            role:  document.getElementById('edit-user-role')?.value
        };
        try {
            showInfoAlert('Updating user...');
            const res = await adminAPI.updateUser(id, payload);
            if (res.success) {
                showSuccessAlert('User updated!');
                document.getElementById('edit-user-section').style.display = 'none';
                e.target.reset();
                await loadUsers();
            } else {
                showErrorAlert(res.error || 'Failed to update user');
            }
        } catch (err) { showErrorAlert(err.message); }
    });

    document.getElementById('add-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name:        `${document.getElementById('student-firstName')?.value || ''} ${document.getElementById('student-lastName')?.value || ''}`.trim(),
            phone:       document.getElementById('student-phone')?.value,
            email:       document.getElementById('student-email')?.value,
            classLevel:  document.getElementById('student-classLevel')?.value,
            section:     document.getElementById('student-section')?.value,
            fatherName:  document.getElementById('student-fatherName')?.value,
            motherName:  document.getElementById('student-motherName')?.value,
            joiningDate: new Date().toISOString().split('T')[0],
            status:      'active'
        };
        try {
            showInfoAlert('Onboarding student...');
            const res = await adminAPI.addStudent(payload);
            if (res.success) { showSuccessAlert('Student onboarded!'); e.target.reset(); await loadStudents(); }
            else showErrorAlert(res.error || 'Failed to onboard student');
        } catch (err) { showErrorAlert(err.message); }
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
        };
        try {
            showInfoAlert('Updating student...');
            const res = await adminAPI.updateStudent(id, payload);
            if (res.success) {
                showSuccessAlert('Student updated!');
                document.getElementById('edit-student-section').style.display = 'none';
                e.target.reset();
                await loadStudents();
            } else {
                showErrorAlert(res.error || 'Failed to update student');
            }
        } catch (err) { showErrorAlert(err.message); }
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/admin-login.html';
    });
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

async function loadTimetable() {
    const list = document.getElementById('timetable-list');
    if (!list) return;

    try {
        showAllTimetable = false; // Reset pagination when loading fresh data
        showInfoAlert('Loading timetable...');
        // First load classes and teachers for the dropdown
        const [ttRes, classesRes, usersRes] = await Promise.all([
            adminAPI.getTimetable(),
            attendanceAPI.getClasses(),
            adminAPI.getUsers()
        ]);

        // Populate Class Dropdown
        const classes = classesRes.data || [];
        const classSel = document.getElementById('tt-class');
        if (classSel && classSel.options.length <= 1) {
            classSel.innerHTML = '<option value="">Select Class</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        // Populate Teacher Dropdown
        const teachers = (usersRes.users || []).filter(u => u.role === 'teacher' && u.isActive);
        const teacherSel = document.getElementById('tt-teacher');
        if (teacherSel && teacherSel.options.length <= 1) {
            teacherSel.innerHTML = '<option value="">Select Teacher</option>' + teachers.map(t => `<option value="${t.id}">${t.phone}</option>`).join('');
        }

        allTimetableData = ttRes.timetable || [];
        hideInfoAlert();

        renderTimetableTable(allTimetableData);
    } catch (err) {
        hideInfoAlert();
        showErrorAlert('Failed to load timetable: ' + err.message);
    }
}

let allTimetableData = [];
let showAllTimetable = false;

function renderTimetableTable(items) {
    const list = document.getElementById('timetable-list');
    const toggleBtn = document.getElementById('btn-toggle-timetable');
    const countText = document.getElementById('timetable-count-text');
    
    if (!list) return;

    if (items.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="empty-state">No timetable entries found.</td></tr>';
        if(toggleBtn) toggleBtn.style.display = 'none';
        if(countText) countText.textContent = '';
        return;
    }

    const displayLimit = 10;
    const toShow = showAllTimetable ? items : items.slice(0, displayLimit);

    function formatTime(t) {
        try { return new Date('1970-01-01T' + t + 'Z').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); }
        catch(e) { return t; }
    }

    list.innerHTML = toShow.map(t => `
        <tr>
            <td>${t.dayOfWeek}</td>
            <td>${formatTime(t.startTime)} - ${formatTime(t.endTime)}</td>
            <td>${t.subject}</td>
            <td>${t.classLevel}</td>
            <td>${t.teacherPhone || t.teacherId}</td>
            <td>
                <button class="btn btn-danger btn-xs" onclick="deleteTimetableRecord(${t.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Show toggle button if more items exist
    if(toggleBtn) {
        toggleBtn.style.display = items.length > displayLimit ? 'block' : 'none';
        toggleBtn.textContent = showAllTimetable ? 'Show Less Timetable' : `Show More Timetable (${items.length})`;
    }
    if(countText) {
        countText.textContent = showAllTimetable ? '' : `Showing ${toShow.length} of ${items.length}`;
    }
}

window.toggleShowAllTimetable = function() {
    showAllTimetable = !showAllTimetable;
    renderTimetableTable(allTimetableData);
};

window.deleteTimetableRecord = async function(id) {
    if (!confirm('Delete this timetable entry?')) return;
    try {
        await adminAPI.deleteTimetable(id);
        showSuccessAlert('Timetable entry deleted!');
        await loadTimetable();
    } catch (err) {
        showErrorAlert('Failed to delete timetable: ' + err.message);
    }
};


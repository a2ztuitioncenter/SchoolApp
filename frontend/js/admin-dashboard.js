/**
 * admin-dashboard.js - Admin dashboard functionality
 */
import { adminAPI, attendanceAPI, homeworkAPI, feesAPI, materialsAPI, notificationsAPI, resultsAPI } from './api.js';
// Current tab state
let currentTab = 'dashboard';

/**
 * Initialize dashboard on page load
 */
// alert("Welcome to admin dashboard")
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in as admin
  const adminId = sessionStorage.getItem('adminUserId');
  const adminRole = sessionStorage.getItem('adminRole');
  
  if (!adminId || adminRole !== 'admin') {
    window.location.href = '/admin-login.html';
    return;
  }

  // Display admin info
  const adminPhone = sessionStorage.getItem('adminPhone');
  document.getElementById('admin-name').textContent = `Admin (${adminPhone})`;

  // Setup tab navigation
  setupTabNavigation();

  // Setup forms
  setupForms();

  // Load initial data
  await loadDashboardData();
});

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.sidebar nav a.nav-link');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.getAttribute('data-tab');
      if (tabName) {
        showTab(tabName);
      }
    });
  });
}

function showTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(t => {
    t.style.display = 'none';
    t.classList.remove('active');
  });
  
  // Remove active state from all nav links
  document.querySelectorAll('.sidebar nav a.nav-link').forEach(b => {
    b.classList.remove('active');
  });

  // Find the target tab (handles both #tabName and #tab-tabName conventions)
  let tab = document.getElementById(tabName);
  if (!tab) tab = document.getElementById('tab-' + tabName);
  
  if (tab) {
    tab.style.display = 'block';
    tab.classList.add('active');
  }

  // Set clicked nav link as active
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');

  // Update current tab state
  currentTab = tabName;

  // Load data when specific tab is opened
  if (tabName === 'dashboard')  loadDashboardData();
  if (tabName === 'users')      loadUsers();
  if (tabName === 'students')   loadStudents();
  if (tabName === 'financials') loadFinancials();
  
  if (tabName === 'attendance') if (typeof initAttendanceTab === 'function') initAttendanceTab();
  if (tabName === 'homework')   if (typeof loadAllHomework === 'function') loadAllHomework();
  if (tabName === 'fees')       if (typeof initFeesTab === 'function') initFeesTab();
  
  if (tabName === 'materials')  if (typeof loadMaterials === 'function') loadMaterials();
  if (tabName === 'timetable')  if (typeof loadTimetable === 'function') loadTimetable();
  if (tabName === 'notifications') if (typeof loadNotifications === 'function') loadNotifications();
  if (tabName === 'results')    if (typeof loadResults === 'function') loadResults();
}

// Make globally available if needed by other inline scripts
window.showTab = showTab;

// ============================================================
// ==================  ATTENDANCE MODULE  =====================
// ============================================================

async function initAttendanceTab() {
  const res = await attendanceAPI.getClasses();
  const classes = res.data || [];

  // Populate both class dropdowns
  ['att-class-select', 'summary-class-select'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">-- Select Class --</option>';
    classes.forEach(c => {
      sel.innerHTML += `<option value="${c}">${c}</option>`;
    });
  });

  // Default today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('att-date').value = today;

  // Default current month
  const month = today.slice(0, 7);
  document.getElementById('summary-month').value = month;
}

async function loadAttendanceSheet() {
  const class_name = document.getElementById('att-class-select').value;
  const date       = document.getElementById('att-date').value;

  if (!class_name || !date) {
    alert('Please select a class and date');
    return;
  }

  // Load students for the class
  const studRes  = await attendanceAPI.getStudentsByClass(class_name);
  const students = studRes.data || [];

  // Load existing attendance for that date
  const attRes  = await attendanceAPI.getByClassAndDate(class_name, date);
  const existing = {};
  (attRes.data || []).forEach(a => { existing[a.student_id] = a.status; });

  const tbody = document.getElementById('att-sheet-body');
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No students found in this class</td></tr>';
    document.getElementById('attendance-sheet').style.display = 'block';
    return;
  }

  students.forEach(s => {
    const current = existing[s.id] || 'present';
    tbody.innerHTML += `
      <tr>
        <td>${s.roll_number || '-'}</td>
        <td>${s.name}</td>
        <td><input type="radio" name="att-${s.id}" value="present"
            ${current === 'present' ? 'checked' : ''}> Present</td>
        <td><input type="radio" name="att-${s.id}" value="absent"
            ${current === 'absent' ? 'checked' : ''}> Absent</td>
        <td><input type="radio" name="att-${s.id}" value="late"
            ${current === 'late' ? 'checked' : ''}> Late</td>
      </tr>`;
  });

  document.getElementById('attendance-sheet').style.display = 'block';
}

async function submitAttendance() {
  const class_name = document.getElementById('att-class-select').value;
  const date       = document.getElementById('att-date').value;

  const rows    = document.querySelectorAll('#att-sheet-body tr');
  const records = [];

  rows.forEach(row => {
    const radios = row.querySelectorAll('input[type="radio"]');
    if (radios.length === 0) return;
    const name      = radios[0].name;
    const student_id = parseInt(name.replace('att-', ''));
    const checked   = row.querySelector(`input[name="${name}"]:checked`);
    if (checked) {
      records.push({ student_id, class_name, date, status: checked.value });
    }
  });

  if (records.length === 0) {
    alert('No attendance data to save');
    return;
  }

  const res = await attendanceAPI.markBulk(records);
  if (res.message) {
    showToast(`✅ ${res.message}`, 'success');
  } else {
    showToast('❌ Failed to save attendance', 'error');
  }
}

async function loadAttendanceSummary() {
  const class_name = document.getElementById('summary-class-select').value;
  const month      = document.getElementById('summary-month').value;

  if (!class_name || !month) {
    alert('Please select a class and month');
    return;
  }

  const res  = await attendanceAPI.getMonthlySummary(class_name, month);
  const data = res.data || [];
  const container = document.getElementById('summary-table-container');

  if (data.length === 0) {
    container.innerHTML = '<p>No attendance data found.</p>';
    return;
  }

  let html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Roll No.</th><th>Name</th>
          <th>Total Days</th><th>Present</th>
          <th>Absent</th><th>Late</th><th>Attendance %</th>
        </tr>
      </thead>
      <tbody>`;

  data.forEach(row => {
    const pct = row.attendance_percent || 0;
    const color = pct >= 75 ? '#2ecc71' : pct >= 50 ? '#f39c12' : '#e74c3c';
    html += `
      <tr>
        <td>${row.roll_number || '-'}</td>
        <td>${row.name}</td>
        <td>${row.total_days}</td>
        <td>${row.present_count}</td>
        <td>${row.absent_count}</td>
        <td>${row.late_count}</td>
        <td><span style="color:${color};font-weight:bold;">${pct}%</span></td>
      </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ============================================================
// ==================  HOMEWORK MODULE  =======================
// ============================================================

let allHomeworkData = [];

async function loadAllHomework() {
  const res = await homeworkAPI.getAll();
  allHomeworkData = res.data || [];
  renderHomeworkTable(allHomeworkData);
}

function renderHomeworkTable(list) {
  const tbody = document.getElementById('homework-table-body');
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No homework found</td></tr>';
    return;
  }

  list.forEach((hw, i) => {
    const due = hw.due_date
      ? new Date(hw.due_date).toLocaleDateString('en-IN')
      : '-';
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${hw.title}</td>
        <td><span class="badge">${hw.class_name}</span></td>
        <td>${hw.subject}</td>
        <td>${due}</td>
        <td>${hw.teacher_name || '-'}</td>
        <td>
          <button class="btn-sm btn-edit"   onclick="editHomework(${hw.id})">✏️ Edit</button>
          <button class="btn-sm btn-delete" onclick="deleteHomework(${hw.id})">🗑️ Delete</button>
        </td>
      </tr>`;
  });
}

function filterHomework() {
  const q = document.getElementById('hw-filter-class').value.toLowerCase();
  const filtered = allHomeworkData.filter(hw =>
    hw.class_name.toLowerCase().includes(q) ||
    hw.title.toLowerCase().includes(q) ||
    hw.subject.toLowerCase().includes(q)
  );
  renderHomeworkTable(filtered);
}

async function saveHomework() {
  const id          = document.getElementById('hw-edit-id').value;
  const title       = document.getElementById('hw-title').value.trim();
  const class_name  = document.getElementById('hw-class').value.trim();
  const subject     = document.getElementById('hw-subject').value.trim();
  const due_date    = document.getElementById('hw-due-date').value;
  const description = document.getElementById('hw-description').value.trim();

  if (!title || !class_name || !subject) {
    alert('Title, Class and Subject are required');
    return;
  }

  const payload = { title, class_name, subject, due_date, description };
  const res = id
    ? await homeworkAPI.update(id, payload)
    : await homeworkAPI.create(payload);

  if (res.data) {
    showToast(id ? '✅ Homework updated!' : '✅ Homework added!', 'success');
    resetHomeworkForm();
    loadAllHomework();
  } else {
    showToast('❌ ' + (res.error || 'Failed'), 'error');
  }
}

async function editHomework(id) {
  const hw = allHomeworkData.find(h => h.id === id);
  if (!hw) return;

  document.getElementById('hw-edit-id').value     = hw.id;
  document.getElementById('hw-title').value        = hw.title;
  document.getElementById('hw-class').value        = hw.class_name;
  document.getElementById('hw-subject').value      = hw.subject;
  document.getElementById('hw-due-date').value     = hw.due_date ? hw.due_date.split('T')[0] : '';
  document.getElementById('hw-description').value  = hw.description || '';
  document.getElementById('hw-form-title').textContent = '✏️ Edit Homework';

  document.getElementById('hw-title').scrollIntoView({ behavior: 'smooth' });
}

async function deleteHomework(id) {
  if (!confirm('Delete this homework?')) return;
  const res = await homeworkAPI.delete(id);
  if (res.message) {
    showToast('🗑️ Homework deleted', 'success');
    loadAllHomework();
  } else {
    showToast('❌ Failed to delete', 'error');
  }
}

function resetHomeworkForm() {
  document.getElementById('hw-edit-id').value      = '';
  document.getElementById('hw-title').value         = '';
  document.getElementById('hw-class').value         = '';
  document.getElementById('hw-subject').value       = '';
  document.getElementById('hw-due-date').value      = '';
  document.getElementById('hw-description').value   = '';
  document.getElementById('hw-form-title').textContent = '➕ Add Homework';
}

// ============================================================
// =====================  FEES MODULE  ========================
// ============================================================

async function initFeesTab() {
  await loadFeeStats();
  await loadFees('all');
}

async function loadFeeStats() {
  const res   = await feesAPI.getStats();
  const stats = res.data || {};
  document.getElementById('fee-stat-collected').textContent   = '₹' + (parseFloat(stats.total_collected) || 0).toFixed(2);
  document.getElementById('fee-stat-pending').textContent     = '₹' + (parseFloat(stats.total_pending) || 0).toFixed(2);
  document.getElementById('fee-stat-paid-count').textContent  = stats.paid_count || 0;
  document.getElementById('fee-stat-unpaid-count').textContent = stats.unpaid_count || 0;
}

async function loadFees(mode = 'all') {
  // Toggle mini tab styles
  document.getElementById('fee-tab-all').classList.toggle('active',    mode === 'all');
  document.getElementById('fee-tab-unpaid').classList.toggle('active', mode === 'unpaid');

  const res  = mode === 'unpaid' ? await feesAPI.getUnpaid() : await feesAPI.getAll();
  const fees = res.data || [];
  renderFeesTable(fees);
}

function renderFeesTable(fees) {
  const tbody = document.getElementById('fees-table-body');
  tbody.innerHTML = '';

  if (fees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No fee records found</td></tr>';
    return;
  }

  fees.forEach((fee, i) => {
    const due  = new Date(fee.due_date).toLocaleDateString('en-IN');
    const paid = fee.paid;
    const statusBadge = paid
      ? `<span class="badge badge-green">Paid</span>`
      : `<span class="badge badge-red">Unpaid</span>`;

    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${fee.student_name || fee.student_id}</td>
        <td>${fee.class_name || '-'}</td>
        <td>₹${parseFloat(fee.amount).toFixed(2)}</td>
        <td>${fee.description || '-'}</td>
        <td>${due}</td>
        <td>${statusBadge}</td>
        <td>
          ${paid
            ? `<button class="btn-sm btn-warning" onclick="toggleFeePaid(${fee.id}, false)">↩️ Unpaid</button>`
            : `<button class="btn-sm btn-success" onclick="toggleFeePaid(${fee.id}, true)">✅ Mark Paid</button>`
          }
          <button class="btn-sm btn-delete" onclick="deleteFeeRecord(${fee.id})">🗑️</button>
        </td>
      </tr>`;
  });
}

async function addFeeRecord() {
  const student_id  = document.getElementById('fee-student-id').value;
  const amount      = document.getElementById('fee-amount').value;
  const due_date    = document.getElementById('fee-due-date').value;
  const description = document.getElementById('fee-description').value.trim();

  if (!student_id || !amount || !due_date) {
    alert('Student ID, Amount and Due Date are required');
    return;
  }

  const res = await feesAPI.add({ student_id, amount, description, due_date });
  if (res.data) {
    showToast('✅ Fee record added!', 'success');
    document.getElementById('fee-student-id').value  = '';
    document.getElementById('fee-amount').value      = '';
    document.getElementById('fee-due-date').value    = '';
    document.getElementById('fee-description').value = '';
    initFeesTab();
  } else {
    showToast('❌ ' + (res.error || 'Failed'), 'error');
  }
}

async function toggleFeePaid(id, markAsPaid) {
  const res = markAsPaid ? await feesAPI.markPaid(id) : await feesAPI.markUnpaid(id);
  if (res.data) {
    showToast(markAsPaid ? '✅ Marked as Paid' : '↩️ Marked as Unpaid', 'success');
    initFeesTab();
  } else {
    showToast('❌ Failed to update', 'error');
  }
}

async function deleteFeeRecord(id) {
  if (!confirm('Delete this fee record?')) return;
  const res = await feesAPI.delete(id);
  if (res.message) {
    showToast('🗑️ Fee deleted', 'success');
    initFeesTab();
  } else {
    showToast('❌ Failed to delete', 'error');
  }
}

// ============================================================
// ==================  TOAST HELPER  ==========================
// ============================================================
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.style.cssText = `
      position:fixed; bottom:30px; right:30px; padding:12px 24px;
      border-radius:8px; font-weight:600; font-size:14px;
      color:#fff; z-index:9999; transition:opacity 0.5s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === 'success' ? '#2ecc71' : '#e74c3c';
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// The duplicate setupTabNavigation has been removed successfully.
/**
 * Setup form submission handlers
 */
function setupForms() {
  // Add user form
  document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
      name: document.getElementById('user-name').value,
      phone: document.getElementById('user-phone').value,
      email: document.getElementById('user-email').value,
      role: document.getElementById('user-role').value,
    };

    try {
      showInfoAlert('Adding user...');
      const response = await adminAPI.addUser(userData);
      
      if (response.success) {
        showSuccessAlert('User added successfully!');
        document.getElementById('add-user-form').reset();
        await loadUsers();
      } else {
        showErrorAlert(response.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      showErrorAlert(error.message);
    }
  });

  // Add student form
  document.getElementById('add-student-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentData = {
      name: `${document.getElementById('student-firstName').value} ${document.getElementById('student-lastName').value}`,
      phone: document.getElementById('student-phone').value,
      email: document.getElementById('student-email').value,
      classLevel: document.getElementById('student-classLevel').value,
      section: document.getElementById('student-section').value,
      fatherName: document.getElementById('student-fatherName').value,
      motherName: document.getElementById('student-motherName').value,
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    try {
      showInfoAlert('Onboarding student...');
      const response = await adminAPI.addStudent(studentData);
      
      if (response.success) {
        showSuccessAlert('Student onboarded successfully!');
        document.getElementById('add-student-form').reset();
        await loadStudents();
      } else {
        showErrorAlert(response.error || 'Failed to onboard student');
      }
    } catch (error) {
      console.error('Error onboarding student:', error);
      showErrorAlert(error.message);
    }
  });

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('adminUserId');
    sessionStorage.removeItem('adminRole');
    sessionStorage.removeItem('adminPhone');
    window.location.href = '/admin-login.html';
  });
}

/**
 * Load dashboard summary data
 */
async function loadDashboardData() {
  try {
    showInfoAlert('Loading dashboard data...');
    console.log('📊 Loading dashboard data...');
    
    const [students, unpaidFees] = await Promise.all([
      adminAPI.getStudents().catch(e => {
        console.error('Error fetching students:', e);
        return { students: [] };
      }),
      adminAPI.getUnpaidFees().catch(e => {
        console.error('Error fetching unpaid fees:', e);
        return { fees: [] };
      }),
    ]);

    console.log('✅ Students:', students);
    console.log('✅ Unpaid Fees:', unpaidFees);

    // Display total students
    const totalStudents = students.students?.length || 0;
    const totalStudentElement = document.getElementById('total-students');
    if (totalStudentElement) {
      totalStudentElement.textContent = totalStudents;
    }

    // Calculate unpaid totals
    const unpaidData = unpaidFees.fees || [];
    const totalUnpaid = unpaidData.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
    const totalUnpaidElement = document.getElementById('total-unpaid');
    if (totalUnpaidElement) {
      totalUnpaidElement.textContent = `₹${totalUnpaid.toLocaleString()}`;
    }

    // Count overdue (assume fees overdue if dueDate is in the past)
    const today = new Date();
    const overdueCount = unpaidData.filter(fee => new Date(fee.duedate) < today).length;
    const overdueElement = document.getElementById('overdue-count');
    if (overdueElement) {
      overdueElement.textContent = overdueCount;
    }
    
    // Hide info alert on success
    const infoAlert = document.getElementById('info-alert');
    if (infoAlert) infoAlert.style.display = 'none';

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showErrorAlert(error.message || 'Failed to load dashboard data');
  }
}

/**
 * Load and display all users
 */
async function loadUsers() {
  try {
    const response = await adminAPI.getUsers();
    const usersList = document.getElementById('users-list');
    const users = response.users || [];

    if (users.length === 0) {
      usersList.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No users found. Add a new user to get started.</p>
          </td>
        </tr>
      `;
      return;
    }

    usersList.innerHTML = users.map(user => `
      <tr>
        <td>${user.name || 'N/A'}</td>
        <td>${user.phone}</td>
        <td><span class="status-badge" style="background: #D6EAF8; color: #154360;">${user.role}</span></td>
        <td><span class="status-badge status-active">${user.isactive ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading users:', error);
    showErrorAlert('Failed to load users');
  }
}

/**
 * Load and display all students
 */
async function loadStudents() {
  try {
    const response = await adminAPI.getStudents();
    const studentsList = document.getElementById('students-list');
    const students = response.students || [];

    if (students.length === 0) {
      studentsList.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No students found. Onboard a student to get started.</p>
          </td>
        </tr>
      `;
      return;
    }

    studentsList.innerHTML = students.map(student => `
      <tr>
        <td>${student.name}</td>
        <td>${student.phone}</td>
        <td>${student.classLevel || 'N/A'}</td>
        <td>
          <span class="status-badge ${student.status === 'active' ? 'status-active' : 'status-pending'}">
            ${student.status}
          </span>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading students:', error);
    showErrorAlert('Failed to load students');
  }
}

/**
 * Load and display unpaid fees
 */
async function loadFinancials() {
  try {
    const response = await adminAPI.getUnpaidFees();
    const financialsList = document.getElementById('financials-list');
    const fees = response.fees || [];

    if (fees.length === 0) {
      financialsList.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <i class="fas fa-check-circle"></i>
            <p>All fees are paid! No outstanding payments.</p>
          </td>
        </tr>
      `;
      return;
    }

    const today = new Date();
    financialsList.innerHTML = fees.map(fee => {
      const dueDate = new Date(fee.duedate);
      const isOverdue = dueDate < today;
      const statusClass = isOverdue ? 'status-overdue' : 'status-pending';
      const statusText = isOverdue ? 'Overdue' : 'Pending';

      return `
        <tr>
          <td>${fee.student_name || 'Unknown'}</td>
          <td>${fee.phone || 'N/A'}</td>
          <td>${fee.classLevel || 'N/A'}</td>
          <td>₹${parseFloat(fee.amount).toLocaleString()}</td>
          <td>${new Date(fee.duedate).toLocaleDateString()}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading financials:', error);
    showErrorAlert('Failed to load financial data');
  }
}

/**
 * Alert helper functions
 */
function showSuccessAlert(message) {
  const alert = document.getElementById('success-alert');
  if (alert) {
    document.getElementById('success-text').textContent = message || 'Success!';
    alert.style.display = 'flex';
    setTimeout(() => alert.style.display = 'none', 4000);
  }
}

function showErrorAlert(message) {
  const alert = document.getElementById('error-alert');
  if (alert) {
    document.getElementById('error-text').textContent = message || 'An unknown error occurred';
    alert.style.display = 'flex';
    setTimeout(() => alert.style.display = 'none', 4000);
  }
}

function showInfoAlert(message) {
  const alert = document.getElementById('info-alert');
  if (alert) {
    document.getElementById('info-text').textContent = message || 'Processing...';
    alert.style.display = 'flex';
  }
}

// Export functions for debugging
export { loadDashboardData, loadUsers, loadStudents, loadFinancials };

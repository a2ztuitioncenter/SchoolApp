import { parentAPI } from 'api.js';
const parentPhone = document.getElementById('parent-phone');
const errorAlert = document.getElementById('error-alert');
const successAlert = document.getElementById('success-alert');
// Initialize on page load
console.log('Welcome to the parent dashboard')
document.addEventListener('DOMContentLoaded', async () => {
console.log('📊 Parent Dashboard initializing...');
try {
const parentUserId = sessionStorage.getItem('parentUserId');
const phone = sessionStorage.getItem('parentPhone');
if (!parentUserId) {
console.error('No parentUserId found in session');
window.location.href = '/parent-login.html';
return;
}
parentPhone.textContent = phone || 'Parent';
// Load all dashboard data
await loadDashboardData(parentUserId);
} catch (error) {
console.error('❌ Dashboard initialization failed:', error);
showError('Failed to initialize dashboard');
}
});
/**
* Load all dashboard data
*/
async function loadDashboardData(parentUserId) {
try {
console.log(' Loading parent dashboard data...');
// Load with individual error handling for each section
await Promise.all([
loadChildren(parentUserId),
loadAttendance(parentUserId),
loadFees(parentUserId),
loadHomework(parentUserId),
loadPerformance(parentUserId),
loadMessages(parentUserId)
]);
console.log('✅ All dashboard data loaded');
} catch (error) {
console.error('Error loading dashboard:', error);
showError('Failed to load dashboard data');
}
}
/**
* Load children linked to parent account
*/
async function loadChildren(parentUserId) {
try {
console.log('👶 Loading children data...');
const response = await parentAPI.getChildren(parentUserId);
if (response.success && response.children) {
const tbody = document.getElementById('children-tbody');
const children = response.children;
if (children.length === 0) {
tbody.innerHTML = `
<tr>
<td colspan="5" class="empty-state">
<i class="fas fa-inbox"></i>
<p>No children linked to this account yet.</p>
</td>
</tr>
`;
return;
}
tbody.innerHTML = children.map(child => `
<tr>
<td>${child.name}</td>
<td>${child.classLevel} - ${child.section || 'N/A'}</td>
<td>${child.rollNumber || 'N/A'}</td>
<td><span class="status-badge status-active">Active</span></td>
<td><button class="btn btn-primary" onclick="viewChildDetails('${child.id}')">View Details</button></td>
</tr>
`).join('');
console.log('✅ Children loaded:', children.length);
}
} catch (error) {
console.error('Error loading children:', error);
}
}
/**
* Load attendance data
*/
async function loadAttendance(parentUserId) {
try {
console.log('📅 Loading attendance data...');
const response = await parentAPI.getAttendance(parentUserId);
if (response.success && response.data) {
const data = response.data;
document.getElementById('avg-attendance').textContent = (data.avgAttendance || 0) + '%';
document.getElementById('total-classes').textContent = data.totalClasses || 0;
document.getElementById('days-present').textContent = data.daysPresent || 0;
document.getElementById('days-absent').textContent = data.daysAbsent || 0;
console.log('✅ Attendance loaded');
}
} catch (error) {
console.error('Error loading attendance:', error);
}
}
/**
* Load fees data
*/
async function loadFees(parentUserId) {
try {
console.log('💰 Loading fees data...');
const response = await parentAPI.getFees(parentUserId);
if (response.success && response.data) {
const data = response.data;
const format = new Intl.NumberFormat('en-IN', {
style: 'currency',
currency: 'INR',
minimumFractionDigits: 0
});
document.getElementById('total-fees').textContent = format.format(data.totalFees || 0);
document.getElementById('fees-paid').textContent = format.format(data.paid || 0);
document.getElementById('fees-pending').textContent = format.format(data.pending || 0);
document.getElementById('fees-overdue').textContent = format.format(data.overdue || 0);
// Load fees table
const tbody = document.getElementById('fees-tbody');
if (data.fees && data.fees.length > 0) {
tbody.innerHTML = data.fees.map(fee => {
const statusClass = fee.status === 'paid' ? 'status-active' : 
fee.status === 'pending' ? 'status-pending' : 'status-overdue';
return `
<tr>
<td>${fee.month || fee.dueDate}</td>
<td>${format.format(fee.amount || 0)}</td>
<td>${new Date(fee.dueDate).toLocaleDateString('en-IN')}</td>
<td><span class="status-badge ${statusClass}">${fee.status || 'Pending'}</span></td>
</tr>
`;
}).join('');
}
console.log('✅ Fees loaded');
}
} catch (error) {
console.error('Error loading fees:', error);
}
}
/**
* Load homework data
*/
async function loadHomework(parentUserId) {
try {
console.log('📝 Loading homework data...');
const response = await parentAPI.getHomework(parentUserId);
if (response.success && response.homework) {
const tbody = document.getElementById('homework-tbody');
const homework = response.homework || [];
if (homework.length === 0) {
tbody.innerHTML = `
<tr>
<td colspan="4" class="empty-state">
<i class="fas fa-inbox"></i>
<p>No homework assignments available.</p>
</td>
</tr>
`;
return;
}
tbody.innerHTML = homework.map(hw => {
const dueDate = new Date(hw.dueDate);
const isOverdue = dueDate < new Date();
const statusClass = isOverdue ? 'status-pending' : 'status-active';
const statusText = isOverdue ? 'Overdue' : 'Active';
return `
<tr>
<td>${hw.subject || 'N/A'}</td>
<td>${hw.topic || hw.title || 'N/A'}</td>
<td>${dueDate.toLocaleDateString('en-IN')}</td>
<td><span class="status-badge ${statusClass}">${statusText}</span></td>
</tr>
`;
}).join('');
console.log('✅ Homework loaded');
}
} catch (error) {
console.error('Error loading homework:', error);
}
}
/**
* Load performance metrics
*/
async function loadPerformance(parentUserId) {
try {
console.log('📈 Loading performance data...');
const response = await parentAPI.getPerformance(parentUserId);
if (response.success && response.data) {
const data = response.data;
document.getElementById('test-average').textContent = (data.testAverage || 0) + '%';
document.getElementById('homework-score').textContent = (data.homeworkScore || 0) + '%';
document.getElementById('participation').textContent = (data.participation || 0) + '%';
document.getElementById('overall-grade').textContent = data.overallGrade || 'N/A';
console.log('✅ Performance loaded');
}
} catch (error) {
console.error('Error loading performance:', error);
}
}
/**
* Load teacher messages
*/
async function loadMessages(parentUserId) {
try {
console.log('💬 Loading messages...');
const response = await parentAPI.getMessages(parentUserId);
if (response.success && response.messages) {
const tbody = document.getElementById('messages-tbody');
const messages = response.messages || [];
if (messages.length === 0) {
tbody.innerHTML = `
<tr>
<td colspan="4" class="empty-state">
<i class="fas fa-inbox"></i>
<p>No messages from teachers yet.</p>
</td>
</tr>
`;
return;
}
tbody.innerHTML = messages.map(msg => `
<tr>
<td>${msg.teacherName || 'Unknown'}</td>
<td>${msg.message || ''}</td>
<td>${new Date(msg.date).toLocaleDateString('en-IN')}</td>
<td><span class="status-badge status-active">Read</span></td>
</tr>
`).join('');
console.log('✅ Messages loaded');
}
} catch (error) {
console.error('Error loading messages:', error);
}
}
/**
* Show error alert
*/
function showError(message) {
errorAlert.textContent = '❌ ' + message;
errorAlert.style.display = 'block';
setTimeout(() => {
errorAlert.style.display = 'none';
}, 5000);
}
/**
* Logout function
*/
window.logout = function() {
sessionStorage.removeItem('parentUserId');
sessionStorage.removeItem('parentPhone');
sessionStorage.removeItem('role');
window.location.href = '/pages/master-dashboard.html';
};
/**
* View child details
*/
window.viewChildDetails = function(childId) {
console.log('Viewing details for child:', childId);
// TODO: Implement child details modal or navigation
alert('Child details: ' + childId);
};
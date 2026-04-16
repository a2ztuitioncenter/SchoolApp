/**
 * api.js - Central API wrapper for all backend calls
 * Provides fetch() utilities and centralized configuration
 */

// Backend Connection Configuration
// Uses environment variable or hardcoded production URL
// For development, set BASE_API_URL to localhost:3000
const getBaseApiUrl = () => {
  // 1. Check if we are on localhost
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3000';
  }

  // 2. Production: Use hardcoded Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://schoolapp-d9y5.onrender.com';
  }

  // Fallback
  return '';
};

const base_api_url = getBaseApiUrl();

/**
 * Get auth token from centralized auth manager
 */
export const getAuthToken = () => {
  try {
    const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
    if (!authStr) return null;
    const auth = JSON.parse(authStr);
    return auth?.token || null;
  } catch (error) {
    console.error('Error reading auth token from localStorage:', error);
    return null;
  }
};

// Kept for import compatibility with admin-dashboard.js
export const checkBackendHealth = async () => true;
export const waitForBackend = async () => true;

/**
 * Generic fetch wrapper with error handling and token injection
 * Automatically includes JWT token from auth-manager
 */
export const apiCall = async (endpoint, options = {}) => {
  // Construct full URL: base_api_url + /api + endpoint
  let url = base_api_url ? `${base_api_url}/api${endpoint}` : `/api${endpoint}`;

  // Conditionally set Content-Type
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  // Disable gzip to avoid decoding issues
  headers['Accept-Encoding'] = 'identity';

  // Add JWT token from centralized auth manager
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Set up timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    console.log(`📡 API [${options.method || 'GET'}] ${endpoint}`);
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle 401/403 (Unauthorized/Forbidden)
    if (response.status === 401 || response.status === 403) {
      const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/teacher-login') || url.includes('/auth/admin-login') || url.includes('/auth/register');
      
      if (!isAuthRequest) {
        console.warn(`🛑 Auth Revoked (${response.status}) at ${endpoint}. Redirecting...`);
        // Use timeout to allow current operation to process the error response
        setTimeout(() => {
          if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            localStorage.removeItem('auth');
            sessionStorage.removeItem('auth');
            window.location.href = '/';
          }
        }, 100);
      }
    }

    // Handle binary or JSON responses
    if (options.responseType === 'blob') {
      return await response.blob();
    }

    // Try to parse response
    let data;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } else {
        data = await response.text();
      }
    } catch (parseError) {
      console.error(`❌ Parse error [${endpoint}]:`, parseError.message);
      data = { error: 'Invalid response format' };
    }

    console.log(`📦 Received (${response.status}) from ${endpoint}`);

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}`;
      return { ...data, error: errorMsg, status: response.status, success: false };
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`🕒 Timeout [${endpoint}] after 15s`);
      return { error: 'Request timed out', success: false };
    }
    console.error(`🚨 Fetch Error [${endpoint}]:`, error.message);
    return { error: error.message, success: false };
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Attendance API
 */
const attendanceAPI = {
  getClasses: () => apiCall('/admin/attendance/classes', { method: 'GET' }),
  getStudentsByClass: (class_name) => apiCall(`/admin/attendance/students?class_name=${encodeURIComponent(class_name)}`, { method: 'GET' }),
  getByClassAndDate: (class_name, date) => apiCall(`/admin/attendance/class?class_name=${encodeURIComponent(class_name)}&date=${date}`, { method: 'GET' }),
  getMonthlySummary: (class_name, month) => apiCall(`/admin/attendance/summary?class_name=${encodeURIComponent(class_name)}&month=${month}`, { method: 'GET' }),
  markBulk: (records) => apiCall('/admin/attendance/mark-bulk', { method: 'POST', body: JSON.stringify({ records }) }),
};

/**
 * Homework API
 */
const homeworkAPI = {
  getAll: (class_name = '') => apiCall(`/admin/homework${class_name ? '?class_name=' + encodeURIComponent(class_name) : ''}`, { method: 'GET' }),
  create: (formData) => apiCall('/admin/homework', {
    method: 'POST',
    body: formData
  }),
  update: (id, formData) => apiCall(`/admin/homework/${id}`, {
    method: 'PUT',
    body: formData
  }),
  delete: (id) => apiCall(`/admin/homework/${id}`, { method: 'DELETE' }),
};

/**
 * Fees API
 */
const feesAPI = {
  getAll: () => apiCall('/admin/fees', { method: 'GET' }),
  getUnpaid: () => apiCall('/admin/fees/unpaid', { method: 'GET' }),
  getStats: () => apiCall('/admin/fees/stats', { method: 'GET' }),
  getByStudent: (student_id) => apiCall(`/admin/fees/student/${student_id}`, { method: 'GET' }),
  add: (data) => apiCall('/admin/fees', { method: 'POST', body: JSON.stringify(data) }),
  markPaid: (id) => apiCall(`/admin/fees/${id}/paid`, { method: 'PATCH' }),
  markUnpaid: (id) => apiCall(`/admin/fees/${id}/unpaid`, { method: 'PATCH' }),
  delete: (id) => apiCall(`/admin/fees/${id}`, { method: 'DELETE' }),
};

/**
 * Materials, Notifications, Results APIs
 */
const materialsAPI = {
  getAll: () => apiCall('/admin/materials', { method: 'GET' }),
  getByClass: (classLevel) => apiCall(`/materials/class/${classLevel}`, { method: 'GET' }),
  create: (formData) => apiCall('/admin/materials', { method: 'POST', body: formData }),
  update: (id, formData) => apiCall(`/admin/materials/${id}`, { method: 'PUT', body: formData }),
  delete: (id) => apiCall(`/admin/materials/${id}`, { method: 'DELETE' }),
};

const notificationsAPI = {
  getAll: () => apiCall('/admin/notifications', { method: 'GET' }),
  create: (data) => apiCall('/admin/notifications', {
    method: 'POST',
    body: data // Send data directly (JSON string or FormData)
  }),
  delete: (id) => apiCall(`/admin/notifications/${id}`, { method: 'DELETE' }),
};

const resultsAPI = {
  getByStudent: (studentId) => apiCall(`/admin/results/${studentId}`, { method: 'GET' }),
  getAll: () => apiCall('/admin/results/all', { method: 'GET' }),
  create: (data) => apiCall('/admin/results', { method: 'POST', body: JSON.stringify(data) }),
};

/**
 * Authentication APIs
 */
export const authAPI = {
  register: (userData) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  teacherRegister: (userData) => apiCall('/auth/teacher-register', { method: 'POST', body: JSON.stringify(userData) }),
  // Student login uses identifier (phone or username) + DOB
  login: (identifier, dateOfBirth) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, dateOfBirth }) }),
  adminLogin: (identifier, password) => apiCall('/auth/admin-login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  teacherLogin: (identifier, password) => apiCall('/auth/teacher-login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  verify: () => apiCall('/auth/verify', { method: 'POST' }),
  checkUsername: (username) => apiCall(`/auth/check-username?username=${encodeURIComponent(username)}`, { method: 'GET' }),
};

/**
 * Student APIs
 */
export const studentAPI = {
  getDashboard: (userId) => apiCall(`/student/${userId}/dashboard`, { method: 'GET' }),
  getAttendance: (userId) => apiCall(`/student/${userId}/attendance`, { method: 'GET' }),
  getFees: (userId) => apiCall(`/student/${userId}/fees`, { method: 'GET' }),
  getSyllabus: (userId) => apiCall(`/student/${userId}/syllabus`, { method: 'GET' }),
  getResults: (userId) => apiCall(`/student/${userId}/results`, { method: 'GET' }),
};

/**
 * Admin APIs
 */
export const adminAPI = {
  getStudents: () => apiCall('/admin/students', { method: 'GET' }),
  getUsers: () => apiCall('/admin/users', { method: 'GET' }),
  addUser: (userData) => apiCall('/admin/users/create', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (id, userData) => apiCall(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  deleteUser: (id) => apiCall(`/admin/users/${id}`, { method: 'DELETE' }),
  toggleUserStatus: (id, isActive) => apiCall(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  addStudent: (studentData) => apiCall('/admin/students/create', { method: 'POST', body: JSON.stringify(studentData) }),
  updateStudent: (id, data) => apiCall(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id) => apiCall(`/admin/students/${id}`, { method: 'DELETE' }),
  toggleStudentStatus: (id, status) => apiCall(`/admin/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getUnpaidFees: () => apiCall('/admin/financials/unpaid-fees', { method: 'GET' }),
  getFinancialSummary: () => apiCall('/admin/financials/report', { method: 'GET' }),
  getAttendanceStats: (month) => apiCall(`/admin/attendance/overall-monthly${month ? `?month=${month}` : ''}`, { method: 'GET' }),
  getTimetable: () => apiCall('/admin/timetable', { method: 'GET' }),
  addTimetable: (data) => apiCall('/admin/timetable', { method: 'POST', body: JSON.stringify(data) }),
  deleteTimetable: (id) => apiCall(`/admin/timetable/${id}`, { method: 'DELETE' }),
  // User Approval System
  getPendingUsers: () => apiCall('/auth/admin/pending-users', { method: 'GET' }),
  approveUser: (userId) => apiCall(`/auth/admin/approve-user/${userId}`, { method: 'POST' }),
  rejectUser: (userId, reason) => apiCall(`/auth/admin/reject-user/${userId}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getTrendData: () => apiCall('/admin/financials/trends', { method: 'GET' }),
};

/**
 * Teacher APIs
 */
export const teacherAPI = {
  // Dashboard
  getDashboard: (teacherId) => apiCall(`/teacher/dashboard/${teacherId || 'me'}`, { method: 'GET' }),
  getTimetable: (teacherId) => apiCall(`/teacher/timetable/${teacherId || 'me'}`, { method: 'GET' }),

  // Attendance
  getAttendanceClasses: () => apiCall('/teacher/attendance/classes', { method: 'GET' }),
  getAttendanceSheet: (_teacherId, classLevel, date) => apiCall(`/teacher/attendance/sheet?classLevel=${encodeURIComponent(classLevel)}&date=${date}`, { method: 'GET' }),
  markBulkAttendance: (_teacherId, records) => apiCall('/teacher/attendance/mark-bulk', { method: 'POST', body: JSON.stringify({ records }) }),
  getAttendanceSummary: (_teacherId, classLevel, month) => apiCall(`/teacher/attendance/summary?classLevel=${encodeURIComponent(classLevel)}&month=${month}`, { method: 'GET' }),

  // Homework
  getHomework: () => apiCall('/teacher/homework', { method: 'GET' }),
  createHomework: (formData) => apiCall('/teacher/homework', { method: 'POST', body: formData }),
  updateHomework: (id, formData) => apiCall(`/teacher/homework/${id}`, { method: 'PUT', body: formData }),
  deleteHomework: (id, teacherId) => apiCall(`/teacher/homework/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),

  // Study Materials
  getMaterials: () => apiCall('/teacher/materials', { method: 'GET' }),
  createMaterial: (formData) => apiCall('/teacher/materials', { method: 'POST', body: formData }),
  updateMaterial: (id, formData) => apiCall(`/teacher/materials/${id}`, { method: 'PUT', body: formData }),
  deleteMaterial: (id, teacherId) => apiCall(`/teacher/materials/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),

  // Syllabus
  getSyllabus: () => apiCall('/teacher/syllabus', { method: 'GET' }),
  createSyllabus: (data) => apiCall('/teacher/syllabus', { method: 'POST', body: JSON.stringify(data) }),
  updateSyllabus: (id, data) => apiCall(`/teacher/syllabus/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSyllabus: (id, teacherId) => apiCall(`/teacher/syllabus/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),

  // Exam Results
  createExamResult: (data) => apiCall('/teacher/exam-results', { method: 'POST', body: JSON.stringify(data) }),
  getExamResults: () => apiCall('/teacher/exam-results', { method: 'GET' }),
};

/**
 * Unified binary download utility
 * Uses fetch + blob + objectURL to ensure no encoding corruption
 */
export const downloadFile = async (filePath, fileName = 'download') => {
  try {
    console.log(`Downloading file: ${filePath}`);
    const blob = await apiCall(`/download?filePath=${encodeURIComponent(filePath)}`, {
      method: 'GET',
      responseType: 'blob'
    });

    // Create a local URL for the blob
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName; // Force download with original filename
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log('File download triggered successfully');
  } catch (err) {
    console.error('Download failed:', err.message);
    throw err;
  }
};

window.downloadFile = downloadFile;

export { attendanceAPI, homeworkAPI, feesAPI, materialsAPI, notificationsAPI, resultsAPI };

/**
 * api.js - Central API wrapper for all backend calls
 * Provides fetch() utilities and centralized configuration
 */

const API_BASE_URL = '/api';

// Health check flag
let isBackendHealthy = false;

/**
 * Get auth token from centralized auth manager
 */
export const getAuthToken = () => {
  try {
    const authStr = localStorage.getItem('auth');
    if (!authStr) return null;
    const auth = JSON.parse(authStr);
    return auth?.token || null;
  } catch (error) {
    console.error('❌ Error reading auth token from localStorage:', error);
    return null;
  }
};

/**
 * Check if backend is available
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch('/health', { 
      method: 'GET',
      timeout: 5000 
    });
    isBackendHealthy = response.ok;
    return isBackendHealthy;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    isBackendHealthy = false;
    return false;
  }
};

/**
 * Wait for backend to be ready (with timeout)
 */
export const waitForBackend = async (maxAttempts = 3, delayMs = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkBackendHealth()) {
      console.log('✅ Backend is ready');
      return true;
    }
    if (i < maxAttempts - 1) {
      console.log(`⏳ Backend not ready, retrying in ${delayMs}ms... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  console.error('❌ Backend failed to respond after multiple attempts');
  return false;
};

// Store auth token in localStorage (now managed by auth-manager)
export const setAuthToken = (token) => {
  // This is now handled by auth-manager.setAuth()
  // Keeping for backward compatibility
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    auth.token = token;
    localStorage.setItem('auth', JSON.stringify(auth));
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
};

export const clearAuthToken = () => {
  sessionStorage.removeItem('authToken');
};

/**
 * Generic fetch wrapper with error handling and token injection
 * Automatically includes JWT token from auth-manager
 */
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
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

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/teacher-login') || url.includes('/auth/admin-login') || url.includes('/auth/register');
      
      if (!isAuthRequest) {
        console.warn('⚠️ Unauthorized: Token expired or invalid. Redirecting to login...');
        try {
          const { clearAuth } = await import('./auth-manager.js');
          clearAuth();
        } catch (error) {
          console.error('❌ Error during 401 cleanup:', error);
          localStorage.removeItem('auth');
          sessionStorage.clear();
        }
        
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
          window.location.href = '/';
        }
        return { error: 'Session expired. Please login again.' };
      }
      
      // For login requests, let the specific handler show the "Invalid credentials" error
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || 'Invalid credentials' };
    }

    // Handle 403 Forbidden (insufficient permissions)
    if (response.status === 403) {
      console.warn('⚠️ Forbidden: Insufficient permissions');
      return { error: 'You do not have permission to access this resource.' };
    }

    // Handle 429 Rate Limit
    if (response.status === 429) {
      const retryAfter = response.headers.get('X-RateLimit-Remaining') || 60;
      console.warn(`⚠️ Rate limited: Please try again in ${retryAfter} seconds`);
      return { error: `Too many requests. Please try again in ${retryAfter} seconds.` };
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
      console.error(`⚠️ Response parse error [${endpoint}]:`, parseError.message);
      data = { error: 'Invalid response format' };
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    throw error;
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
  getByClass: (classLevel) => apiCall(`/admin/materials/class/${classLevel}`, { method: 'GET' }),
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
};

const resultsAPI = {
  getByStudent: (studentId) => apiCall(`/admin/results/${studentId}`, { method: 'GET' }),
  getAll: () => apiCall('/admin/results', { method: 'GET' }),
  create: (data) => apiCall('/admin/results', { method: 'POST', body: JSON.stringify(data) }),
};

/**
 * Authentication APIs
 */
export const authAPI = {
  register: (userData) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  teacherRegister: (userData) => apiCall('/auth/teacher-register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (phone, password, role = 'student') => apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password, role }) }),
  adminLogin: (phone, password) => apiCall('/auth/admin-login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  teacherLogin: (phone, password) => apiCall('/auth/teacher-login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  verify: () => apiCall('/auth/verify', { method: 'POST' }),
};

/**
 * Student APIs
 */
export const studentAPI = {
  getDashboard: (userId) => apiCall(`/student/${userId}/dashboard`, { method: 'GET' }),
  getAttendance: (userId) => apiCall(`/student/${userId}/attendance`, { method: 'GET' }),
  getFees: (userId) => apiCall(`/student/${userId}/fees`, { method: 'GET' }),
  getSyllabus: (userId) => apiCall(`/student/${userId}/syllabus`, { method: 'GET' }),
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
  getDashboard: (teacherId) => apiCall(`/teacher/dashboard/${teacherId}`, { method: 'GET' }),
  getTimetable:  (teacherId) => apiCall(`/teacher/timetable/${teacherId}`, { method: 'GET' }),

  // Attendance
  getAttendanceClasses: (teacherId) => apiCall(`/teacher/attendance/classes?teacherId=${teacherId}`, { method: 'GET' }),
  getAttendanceSheet:   (teacherId, classLevel, date) => apiCall(`/teacher/attendance/sheet?teacherId=${teacherId}&classLevel=${encodeURIComponent(classLevel)}&date=${date}`, { method: 'GET' }),
  markBulkAttendance:   (teacherId, records) => apiCall('/teacher/attendance/mark-bulk', { method: 'POST', body: JSON.stringify({ teacherId, records }) }),
  getAttendanceSummary: (teacherId, classLevel, month) => apiCall(`/teacher/attendance/summary?teacherId=${teacherId}&classLevel=${encodeURIComponent(classLevel)}&month=${month}`, { method: 'GET' }),

  // Homework
  getHomework:    (teacherId) => apiCall(`/teacher/homework?teacherId=${teacherId}`, { method: 'GET' }),
  createHomework: (formData)  => apiCall('/teacher/homework', { method: 'POST', body: formData }),
  updateHomework: (id, formData) => apiCall(`/teacher/homework/${id}`, { method: 'PUT', body: formData }),
  deleteHomework: (id, teacherId) => apiCall(`/teacher/homework/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),

  // Study Materials
  getMaterials:    (teacherId) => apiCall(`/teacher/materials?teacherId=${teacherId}`, { method: 'GET' }),
  createMaterial:  (formData)  => apiCall('/teacher/materials', { method: 'POST', body: formData }),
  updateMaterial:  (id, formData) => apiCall(`/teacher/materials/${id}`, { method: 'PUT', body: formData }),
  deleteMaterial:  (id, teacherId) => apiCall(`/teacher/materials/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),

  // Syllabus
  getSyllabus:    (teacherId) => apiCall(`/teacher/syllabus?teacherId=${teacherId}`, { method: 'GET' }),
  createSyllabus: (data)      => apiCall('/teacher/syllabus', { method: 'POST', body: JSON.stringify(data) }),
  updateSyllabus: (id, data)  => apiCall(`/teacher/syllabus/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSyllabus: (id, teacherId) => apiCall(`/teacher/syllabus/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),
};

/**
 * Unified binary download utility
 * Uses fetch + blob + objectURL to ensure no encoding corruption
 */
export const downloadFile = async (filePath, fileName = 'download') => {
  try {
    console.log(`📂 Downloading file: ${filePath}`);
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
    console.log('✅ File download triggered successfully');
  } catch (err) {
    console.error('❌ Download failed:', err.message);
    throw err;
  }
};

window.downloadFile = downloadFile;

export { attendanceAPI, homeworkAPI, feesAPI, materialsAPI, notificationsAPI, resultsAPI };

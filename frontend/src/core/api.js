/**
 * api.js - Central API wrapper for all backend calls
 * Provides fetch() utilities and centralized configuration
 */

// Backend Connection Configuration
const getBaseApiUrl = () => {
  const isLocal = typeof window !== 'undefined' && 
                 (window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.hostname.endsWith('.trycloudflare.com'));
                  
  if (isLocal) {
    return 'http://localhost:3000';
  }
  
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://schoolapp-d9y5.onrender.com';
  }
  return '';
};

const base_api_url = getBaseApiUrl();

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

export const checkBackendHealth = async () => true;
export const waitForBackend = async () => true;

/**
 * Generic fetch wrapper with error handling and token injection
 */
export const apiCall = async (endpoint, options = {}) => {
  let url = base_api_url ? `${base_api_url}/api${endpoint}` : `/api${endpoint}`;

  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  headers['Accept-Encoding'] = 'identity';

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/teacher-login') || url.includes('/auth/admin-login') || url.includes('/auth/register');
      if (!isAuthRequest) {
        setTimeout(() => {
          if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            localStorage.removeItem('auth');
            sessionStorage.removeItem('auth');
            window.location.href = '/';
          }
        }, 100);
      }
    }

    if (options.responseType === 'blob') {
      return await response.blob();
    }

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
      data = { error: 'Invalid response format' };
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}`;
      return { ...data, error: errorMsg, status: response.status, success: false };
    }

    return data;
  } catch (error) {
    return { error: error.message, success: false };
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Attendance API - Standardized on classLevel and section
 */
const attendanceAPI = {
  getClasses: () => apiCall('/admin/attendance/classes', { method: 'GET' }),
  getSectionsByClass: (classLevel) => apiCall(`/admin/attendance/sections?classLevel=${encodeURIComponent(classLevel)}`, { method: 'GET' }),
  getStudentsByClass: (classLevel, section = 'A') => apiCall(`/admin/attendance/students?classLevel=${encodeURIComponent(classLevel)}&section=${encodeURIComponent(section)}`, { method: 'GET' }),
  getByClassAndDate: (classLevel, date, section = 'A') => apiCall(`/admin/attendance/class?classLevel=${encodeURIComponent(classLevel)}&date=${date}&section=${encodeURIComponent(section)}`, { method: 'GET' }),
  getMonthlySummary: (classLevel, month, section = 'A') => apiCall(`/admin/attendance/summary?classLevel=${encodeURIComponent(classLevel)}&month=${month}&section=${encodeURIComponent(section)}`, { method: 'GET' }),
  markBulk: (records) => apiCall('/admin/attendance/mark-bulk', { method: 'POST', body: JSON.stringify({ records }) }),
};

/**
 * Homework API
 */
const homeworkAPI = {
  getAll: (classLevel = '', section = '') => apiCall(`/admin/homework?classLevel=${encodeURIComponent(classLevel)}&section=${encodeURIComponent(section)}`, { method: 'GET' }),
  create: (formData) => apiCall('/admin/homework', { method: 'POST', body: formData }),
  update: (id, formData) => apiCall(`/admin/homework/${id}`, { method: 'PUT', body: formData }),
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
  getAll: (classLevel = '', section = '') => {
    const params = new URLSearchParams();
    if (classLevel) params.set('classLevel', classLevel);
    if (section) params.set('section', section);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/materials${suffix}`, { method: 'GET' });
  },
  getByClass: (classLevel = '', section = '') => materialsAPI.getAll(classLevel, section),
  create: (formData) => apiCall('/materials/upload', { method: 'POST', body: formData }),
  update: (id, formData) => apiCall(`/materials/${id}`, { method: 'PUT', body: formData }),
  delete: (id) => apiCall(`/materials/${id}`, { method: 'DELETE' }),
};

const notificationsAPI = {
  getAll: () => apiCall('/admin/notifications', { method: 'GET' }),
  create: (data) => apiCall('/admin/notifications', { method: 'POST', body: data }),
  delete: (id) => apiCall(`/admin/notifications/${id}`, { method: 'DELETE' }),
};

const resultsAPI = {
  getByStudent: (studentId) => apiCall(`/admin/results/${studentId}`, { method: 'GET' }),
  getAll: () => apiCall('/admin/results/all', { method: 'GET' }),
  create: (data) => apiCall('/admin/results', { method: 'POST', body: JSON.stringify(data) }),
};

const subjectsAPI = {
  // Master Subjects (The global library of subjects)
  getMaster: () => apiCall('/subjects/master', { method: 'GET' }),
  addMaster: (data) => apiCall('/subjects/admin', { method: 'POST', body: JSON.stringify(data) }),
  deleteMaster: (id) => apiCall(`/subjects/admin/${id}`, { method: 'DELETE' }),

  // Subject Assignments (Mapping subjects to specific classes/sections)
  getAll: (classLevel = '', section = '', teacherId = '') => {
    const params = new URLSearchParams();
    if (classLevel) params.set('classLevel', classLevel);
    if (section) params.set('section', section);
    if (teacherId) params.set('teacherId', teacherId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/subjects${suffix}`, { method: 'GET' });
  },
  getTeacherSubjects: () => apiCall('/subjects/teacher', { method: 'GET' }),
  assign: (data) => apiCall('/subjects/assign', { method: 'POST', body: JSON.stringify(data) }),
  deleteAssignment: (id) => apiCall(`/subjects/assign/${id}`, { method: 'DELETE' }),

  // Aliases for compatibility
  create: (data) => subjectsAPI.addMaster(data),
  add: (data) => subjectsAPI.addMaster(data),
  delete: (id) => subjectsAPI.deleteMaster(id),
};

/**
 * Authentication APIs
 */
export const authAPI = {
  register: (userData) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  teacherRegister: (userData) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
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
  getPendingUsers: () => apiCall('/auth/admin/pending-users', { method: 'GET' }),
  approveUser: (userId) => apiCall(`/auth/admin/approve-user/${userId}`, { method: 'POST' }),
  rejectUser: (userId, reason) => apiCall(`/auth/admin/reject-user/${userId}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getTrendData: () => apiCall('/admin/financials/trends', { method: 'GET' }),
  // ERP Dynamic Dropdowns
  getClasses: () => apiCall('/admin/classes', { method: 'GET' }),
  getSections: (classLevel) => apiCall(`/admin/sections?classLevel=${encodeURIComponent(classLevel)}`, { method: 'GET' }),
  getTeachersByClass: (classLevel, section) => apiCall(`/admin/teachers-by-class?classLevel=${encodeURIComponent(classLevel)}&section=${encodeURIComponent(section)}`, { method: 'GET' }),
};

export {
  attendanceAPI,
  homeworkAPI,
  feesAPI,
  materialsAPI,
  notificationsAPI,
  resultsAPI,
  subjectsAPI
};

/**
 * Teacher APIs
 */
/**
 * Teacher APIs - Fixed to use correct authentication and parameter passing
 */
export const teacherAPI = {
  getDashboard: (teacherId) => apiCall(`/teacher/dashboard/${teacherId || 'me'}`, { method: 'GET' }),
  getTimetable: (teacherId) => apiCall(`/teacher/timetable/${teacherId || 'me'}`, { method: 'GET' }),
  getAttendanceClasses: (teacherId) => apiCall(`/teacher/attendance/classes${teacherId ? '?teacherId=' + encodeURIComponent(teacherId) : ''}`, { method: 'GET' }),
  getSectionsByClass: (classLevel, teacherId) => apiCall(`/teacher/attendance/sections?classLevel=${encodeURIComponent(classLevel)}${teacherId ? '&teacherId=' + encodeURIComponent(teacherId) : ''}`, { method: 'GET' }),
  getAttendanceSheet: (_teacherId, classLevel, date, section = 'A') => apiCall(`/teacher/attendance/sheet?classLevel=${encodeURIComponent(classLevel)}&date=${date}&section=${encodeURIComponent(section)}`, { method: 'GET' }),
  markBulkAttendance: (teacherId, records) => apiCall('/teacher/attendance/mark-bulk', { method: 'POST', body: JSON.stringify({ teacherId, records }) }),
  getAttendanceSummary: (_teacherId, classLevel, month, section = 'A') => apiCall(`/teacher/attendance/summary?classLevel=${encodeURIComponent(classLevel)}&month=${month}&section=${encodeURIComponent(section)}`, { method: 'GET' }),
  getHomework: () => apiCall('/teacher/homework', { method: 'GET' }),
  createHomework: (formData) => apiCall('/teacher/homework', { method: 'POST', body: formData }),
  updateHomework: (id, formData) => apiCall(`/teacher/homework/${id}`, { method: 'PUT', body: formData }),
  deleteHomework: (id, teacherId) => apiCall(`/teacher/homework/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),
  getMaterials: (_teacherId) => apiCall('/materials', { method: 'GET' }),
  createMaterial: (formData) => apiCall('/materials/upload', { method: 'POST', body: formData }),
  updateMaterial: (id, formData) => apiCall(`/materials/${id}`, { method: 'PUT', body: formData }),
  deleteMaterial: (id, _teacherId) => apiCall(`/materials/${id}`, { method: 'DELETE' }),
  getSyllabus: () => apiCall('/teacher/syllabus', { method: 'GET' }),
  createSyllabus: (data) => apiCall('/teacher/syllabus', { method: 'POST', body: JSON.stringify(data) }),
  updateSyllabus: (id, data) => apiCall(`/teacher/syllabus/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSyllabus: (id, teacherId) => apiCall(`/teacher/syllabus/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }) }),
  createExamResult: (data) => apiCall('/teacher/exam-results', { method: 'POST', body: JSON.stringify(data) }),
  getExamResults: () => apiCall('/teacher/exam-results', { method: 'GET' }),
};

export const downloadFile = async (filePath, fileName = 'download') => {
  try {
    const blob = await apiCall(`/download?filePath=${encodeURIComponent(filePath)}`, {
      method: 'GET',
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download failed:', err.message);
    throw err;
  }
};

window.downloadFile = downloadFile;

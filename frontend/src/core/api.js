/**
 * api.js - Central API wrapper for all backend calls
 * Provides fetch() utilities and centralized configuration
 */

import { config } from '../config/api.js';

export const base_api_url = config.API_BASE_URL;

/**
 * Read the CSRF token from the csrf cookie (set by backend, readable by JS)
 */
const getCsrfToken = () => {
  // Try cookie first (same-site)
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);

  // Fallback to stored auth state (cross-site)
  try {
    const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
    if (authStr) {
      const auth = JSON.parse(authStr);
      return auth.csrfToken;
    }
  } catch (e) {}
  
  return null;
};

export const checkBackendHealth = async () => true;
export const waitForBackend = async () => true;

/**
 * Generic fetch wrapper with error handling and token injection
 */
export const apiCall = async (endpoint, options = {}) => {
  let cleanPath = endpoint.startsWith('/api') ? endpoint.slice(4) : endpoint;
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
  let url = base_api_url ? `${base_api_url}/api${cleanPath}` : `/api${cleanPath}`;

  // Diagnostic Log for production troubleshooting (only if on localhost or explicitly requested via debug param)
  const isDebug = typeof window !== 'undefined' && (window.location.search.includes('debug=true') || window.location.hostname === 'localhost');
  
  if (endpoint.includes('/auth/admin-login') && isDebug) {
    console.log("[API TRACE] Admin Login Request:", {
      endpoint,
      cleanPath,
      base_api_url,
      finalUrl: url
    });
  }
  
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && isDebug) {
    console.log(`[API] ${options.method || 'GET'} ${url}`, {
      base: base_api_url,
      endpoint
    });
  }


  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  headers['Accept-Encoding'] = 'identity';

  // Add CSRF token for mutating requests
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const controller = new AbortController();
  const signal = options.signal || controller.signal;
  const timeoutId = !options.signal ? setTimeout(() => controller.abort(), 15000) : null;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal,
      credentials: 'include' // Send cookies with every request
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/teacher-login') || url.includes('/auth/admin-login') || url.includes('/auth/register');
      if (!isAuthRequest) {
        // Try to refresh the token silently
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Retry the original request once with a fresh timeout/signal
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
          
          try {
            const retryResp = await fetch(url, { 
              ...options, 
              headers, 
              signal: retryController.signal, 
              credentials: 'include' 
            });
            clearTimeout(retryTimeoutId);

            if (retryResp.ok) {
              if (options.responseType === 'blob') return await retryResp.blob();
              const ct = retryResp.headers.get('content-type');
              if (ct?.includes('application/json')) {
                const text = await retryResp.text();
                return text ? JSON.parse(text) : {};
              }
              return await retryResp.text();
            }
          } catch (retryError) {
            clearTimeout(retryTimeoutId);
            console.error('Retry request failed:', retryError);
          }
        }
        // Refresh failed or retry failed — redirect to login
        console.warn(`[AUTH] 401 Failure: Redirecting to login. 
          Endpoint: ${endpoint}
          Path: ${window.location.pathname}`);
        
        setTimeout(() => {
          const path = window.location.pathname;
          const isLandingPage = path === '/' || path === '/index.html' || path === '';
          
          if (!isLandingPage) {
            console.log('[AUTH] Clearing local auth state and returning to landing page');
            sessionStorage.removeItem('auth');
            // Use a slight delay to allow any pending setAuth to finish
            window.location.href = '/';
          }
        }, 500);
      }
    }

    if (response.status === 403) {
      let isAuthMismatch = false;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const clonedResponse = response.clone();
          const errBody = await clonedResponse.json();
          const errorMsg = errBody?.error || errBody?.message || '';
          if (
            errBody?.code === 'FORBIDDEN' ||
            (errorMsg.toLowerCase().includes('user role') && errorMsg.toLowerCase().includes('does not have access'))
          ) {
            isAuthMismatch = true;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      
      if (isAuthMismatch) {
        console.warn(`[AUTH] 403 Forbidden/Mismatch: Clearing session and reloading. Path: ${window.location.pathname}`);
        setTimeout(() => {
          const path = window.location.pathname;
          const isLandingPage = path === '/' || path === '/index.html' || path === '';
          if (!isLandingPage) {
            sessionStorage.removeItem('auth');
            localStorage.removeItem('auth');
            window.location.href = '/';
          }
        }, 500);
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
      console.error(`[API FAIL] ${method} ${url} | Status: ${response.status}`, data);
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}`;
      return { ...data, error: errorMsg, status: response.status, success: false };
    }

    return { ...data, success: true, status: response.status };
  } catch (error) {
    // Re-throw AbortError so callers can detect signal cancellation via err.name === 'AbortError'
    if (error.name === 'AbortError') throw error;
    return { error: error.message, success: false };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/**
 * Upload file with progress tracking using XMLHttpRequest
 */
export const uploadFileWithProgress = (endpoint, formData, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let url = base_api_url ? `${base_api_url}/api${endpoint}` : `/api${endpoint}`;

    xhr.open('POST', url, true);
    xhr.withCredentials = true; // Essential for auth cookies

    // Add CSRF token
    const csrf = getCsrfToken();
    if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);

    onProgress = typeof onProgress === 'function' ? onProgress : null;

    // Track progress
    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (typeof onProgress === 'function' && event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      let response;
      try {
        response = JSON.parse(xhr.responseText);
      } catch (e) {
        response = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
      } else {
        reject(response || new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    xhr.send(formData);
  });
};

/** Silent token refresh — called when a 401 is received */
let _refreshPromise = null;
async function tryRefreshToken() {
  // Deduplicate concurrent refresh attempts
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const url = base_api_url ? `${base_api_url}/api/auth/refresh` : '/api/auth/refresh';
      // Include CSRF token so cross-site refresh doesn't fail with 403
      const csrf = getCsrfToken();
      const headers = csrf ? { 'X-CSRF-Token': csrf } : {};
      const resp = await fetch(url, { method: 'POST', credentials: 'include', headers });
      return resp.ok;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

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
  create: (data) => apiCall('/admin/notifications', { method: 'POST', body: JSON.stringify(data) }), delete: (id) => apiCall(`/admin/notifications/${id}`, { method: 'DELETE' }),
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
  getSections: (classLevel) => apiCall(`/auth/sections?classLevel=${encodeURIComponent(classLevel)}`, { method: 'GET' }),
  changePassword: (data) => apiCall('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
};


/**
 * Student APIs
 */
export const studentAPI = {
  getDashboard: (userId, options = {}) => apiCall(`/student/me/dashboard`, { method: 'GET', ...options }),
  getAttendance: (userId, options = {}) => apiCall(`/student/me/attendance`, { method: 'GET', ...options }),
  getFees: (userId, options = {}) => apiCall(`/student/me/fees`, { method: 'GET', ...options }),
  getSyllabus: (userId, options = {}) => apiCall(`/student/me/syllabus`, { method: 'GET', ...options }),
  getResults: (userId, options = {}) => apiCall(`/student/me/results`, { method: 'GET', ...options }),
  getSubmissions: (userId, options = {}) => apiCall(`/submissions/student/me`, { method: 'GET', ...options }),
};

/**
 * Admin APIs
 */
export const adminAPI = {
  getDashboardSummary: () => apiCall('/admin/stats/summary', { method: 'GET' }),
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
  approveUser: (userId, data = {}) => apiCall(`/auth/admin/approve-user/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
  rejectUser: (userId, reason) => apiCall(`/auth/admin/reject-user/${userId}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getTrendData: () => apiCall('/admin/financials/trends', { method: 'GET' }),
  // ERP Dynamic Dropdowns
  getClasses: () => apiCall('/admin/classes', { method: 'GET' }),
  getSections: (classLevel) => apiCall(`/admin/sections?classLevel=${encodeURIComponent(classLevel)}`, { method: 'GET' }),
  getTeachersByClass: (classLevel, section) => apiCall(`/admin/teachers-by-class?classLevel=${encodeURIComponent(classLevel)}&section=${encodeURIComponent(section)}`, { method: 'GET' }),

  // Profile & Settings
  getProfile: () => apiCall('/admin/profile', { method: 'GET' }),
  updateProfile: (data) => apiCall('/admin/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getOrganization: () => apiCall('/admin/organization', { method: 'GET' }),
  getAuditLogs: () => apiCall('/admin/audit-logs', { method: 'GET' }),

  // Content Pages (dynamic editable content)
  getContent: (key) => apiCall(`/admin/content/${key}`, { method: 'GET' }),
  getAllContent: () => apiCall('/admin/content', { method: 'GET' }),
  updateContent: (key, content) => apiCall(`/admin/content/${key}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deleteContent: (key) => apiCall(`/admin/content/${key}`, { method: 'DELETE' }),
  getClassLevels: () => apiCall('/auth/admin/class-levels', { method: 'GET' }),
  getUserAssignments: (id) => apiCall(`/admin/users/${id}/assignments`, { method: 'GET' }),
};

/**
 * Profile APIs
 */
export const profileAPI = {
  update: (formData) => apiCall('/profile/update', { method: 'PUT', body: formData }),
};

/**
 * Content APIs (Authenticated)
 */
export const contentAPI = {
  get: (type) => apiCall(`/content?type=${encodeURIComponent(type)}`, { method: 'GET' }),
};

/**
 * Public content fetcher — no auth required (for landing page)
 */
export const fetchPublicContent = async (key) => {
  const url = base_api_url ? `${base_api_url}/api/public/content/${key}` : `/api/public/content/${key}`;
  try {
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    return data;
  } catch (e) {
    return { success: false, error: e.message };
  }
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
 * Submissions API
 */
export const submissionsAPI = {
  submit: (formData, options = {}) => apiCall('/submissions', { method: 'POST', body: formData, ...options }),
  getForHomework: (homeworkId, options = {}) => apiCall(`/submissions/homework/${homeworkId}`, { method: 'GET', ...options }),
  getTeacherSubmissions: (options = {}) => apiCall('/submissions/teacher', { method: 'GET', ...options }),
  review: (submissionId, data, options = {}) => apiCall(`/submissions/${submissionId}/review`, { method: 'PUT', body: JSON.stringify(data), ...options }),
};

export const assignmentsAPI = {
  getActive: (options = {}) => apiCall('/assignments/active', { method: 'GET', ...options }),
};

/**
 * Teacher APIs
 */
/**
 * Teacher APIs - Fixed to use correct authentication and parameter passing
 */
export const teacherAPI = {
  getDashboard: (teacherId, options = {}) => apiCall(`/teacher/dashboard/${teacherId || 'me'}`, { method: 'GET', ...options }),
  getTimetable: (teacherId, options = {}) => apiCall(`/teacher/timetable/${teacherId || 'me'}`, { method: 'GET', ...options }),
  getAttendanceClasses: (teacherId, options = {}) => apiCall(`/teacher/attendance/classes${teacherId ? '?teacherId=' + encodeURIComponent(teacherId) : ''}`, { method: 'GET', ...options }),
  getSectionsByClass: (classLevel, teacherId, options = {}) => apiCall(`/teacher/attendance/sections?classLevel=${encodeURIComponent(classLevel)}${teacherId ? '&teacherId=' + encodeURIComponent(teacherId) : ''}`, { method: 'GET', ...options }),
  getAttendanceSheet: (_teacherId, classLevel, date, section = 'A', options = {}) => apiCall(`/teacher/attendance/sheet?classLevel=${encodeURIComponent(classLevel)}&date=${date}&section=${encodeURIComponent(section)}`, { method: 'GET', ...options }),
  markBulkAttendance: (teacherId, records, options = {}) => apiCall('/teacher/attendance/mark-bulk', { method: 'POST', body: JSON.stringify({ teacherId, records }), ...options }),
  getAttendanceSummary: (_teacherId, classLevel, month, section = 'A', options = {}) => apiCall(`/teacher/attendance/summary?classLevel=${encodeURIComponent(classLevel)}&month=${month}&section=${encodeURIComponent(section)}`, { method: 'GET', ...options }),
  getHomework: (options = {}) => apiCall('/teacher/homework', { method: 'GET', ...options }),
  createHomework: (formData, options = {}) => apiCall('/teacher/homework', { method: 'POST', body: formData, ...options }),
  updateHomework: (id, formData, options = {}) => apiCall(`/teacher/homework/${id}`, { method: 'PUT', body: formData, ...options }),
  deleteHomework: (id, teacherId, options = {}) => apiCall(`/teacher/homework/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }), ...options }),
  getMaterials: (_teacherId, options = {}) => apiCall('/materials', { method: 'GET', ...options }),
  createMaterial: (formData, options = {}) => apiCall('/materials/upload', { method: 'POST', body: formData, ...options }),
  updateMaterial: (id, formData, options = {}) => apiCall(`/materials/${id}`, { method: 'PUT', body: formData, ...options }),
  deleteMaterial: (id, _teacherId, options = {}) => apiCall(`/materials/${id}`, { method: 'DELETE', ...options }),
  getSyllabus: (options = {}) => apiCall('/teacher/syllabus', { method: 'GET', ...options }),
  createSyllabus: (data, options = {}) => apiCall('/teacher/syllabus', { method: 'POST', body: JSON.stringify(data), ...options }),
  updateSyllabus: (id, data, options = {}) => apiCall(`/teacher/syllabus/${id}`, { method: 'PUT', body: JSON.stringify(data), ...options }),
  deleteSyllabus: (id, teacherId, options = {}) => apiCall(`/teacher/syllabus/${id}`, { method: 'DELETE', body: JSON.stringify({ teacherId }), ...options }),
  createExamResult: (data, options = {}) => apiCall('/teacher/exam-results', { method: 'POST', body: JSON.stringify(data), ...options }),
  getExamResults: (options = {}) => apiCall('/teacher/exam-results', { method: 'GET', ...options }),
};

export const downloadFile = async (filePath, fileName = 'download') => {
  try {
    // If the path is already a storage download link, use it directly
    // Otherwise wrap it in the legacy download handler for local files
    let endpoint = filePath;
    if (!filePath.startsWith('/storage/download/') && !filePath.startsWith('/api/storage/download/')) {
      endpoint = `/download?filePath=${encodeURIComponent(filePath)}`;
    }

    const blob = await apiCall(endpoint, {
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

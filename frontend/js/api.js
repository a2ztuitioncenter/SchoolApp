/**
 * api.js - Central API wrapper for all backend calls
 * Provides fetch() utilities and centralized configuration
 */

const API_BASE_URL = 'http://localhost:3000/api';

// Store auth token in sessionStorage
export const setAuthToken = (token) => {
  sessionStorage.setItem('authToken', token);
};

export const getAuthToken = () => {
  return sessionStorage.getItem('authToken');
};

export const clearAuthToken = () => {
  sessionStorage.removeItem('authToken');
};

/**
 * Generic fetch wrapper with error handling and token injection
 */
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = data?.error || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    throw error;
  }
};

/**
 * Authentication APIs
 */
export const authAPI = {
  // Mock login endpoint (development)
  login: async (phone, role = 'student') => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
    });
  },

  // Admin login endpoint
  adminLogin: async (phone, password) => {
    return apiCall('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  // Teacher login endpoint
  teacherLogin: async (phone, password) => {
    return apiCall('/auth/teacher-login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  // Parent login endpoint
  parentLogin: async (phone, password) => {
    return apiCall('/auth/parent-login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  // Verify token is still valid
  verify: async () => {
    return apiCall('/auth/verify', {
      method: 'POST',
    });
  },
};

/**
 * Student APIs
 */
export const studentAPI = {
  // Get complete dashboard data for logged-in student
  getDashboard: async (userId) => {
    return apiCall(`/student/${userId}/dashboard`, {
      method: 'GET',
    });
  },

  // Get attendance records
  getAttendance: async (userId) => {
    return apiCall(`/student/${userId}/attendance`, {
      method: 'GET',
    });
  },

  // Get fees information
  getFees: async (userId) => {
    return apiCall(`/student/${userId}/fees`, {
      method: 'GET',
    });
  },
};

/**
 * Admin APIs
 */
export const adminAPI = {
  // Get all students
  getStudents: async () => {
    return apiCall('/admin/students', {
      method: 'GET',
    });
  },

  // Get all users
  getUsers: async () => {
    return apiCall('/admin/users', {
      method: 'GET',
    });
  },

  // Add new user
  addUser: async (userData) => {
    return apiCall('/admin/users/create', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Add new student
  addStudent: async (studentData) => {
    return apiCall('/admin/students/create', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  // Get unpaid fees
  getUnpaidFees: async () => {
    return apiCall('/admin/financials/unpaid-fees', {
      method: 'GET',
    });
  },

  // Get financial summary
  getFinancialSummary: async () => {
    return apiCall('/admin/financials/report', {
      method: 'GET',
    });
  },
};

/**
 * Teacher APIs
 */
export const teacherAPI = {
  // Get teacher's dashboard data
  getDashboard: async (teacherId) => {
    return apiCall(`/teacher/dashboard/${teacherId}`, {
      method: 'GET',
    });
  },

  // Get homework for a specific class
  getClassHomework: async (classLevel, section) => {
    return apiCall(`/teacher/class/${classLevel}?section=${section}`, {
      method: 'GET',
    });
  },

  // Add new homework
  addHomework: async (homeworkData) => {
    return apiCall('/teacher/homework/add', {
      method: 'POST',
      body: JSON.stringify(homeworkData),
    });
  },

  // Update homework
  updateHomework: async (homeworkId, homeworkData) => {
    return apiCall(`/teacher/homework/${homeworkId}`, {
      method: 'PUT',
      body: JSON.stringify(homeworkData),
    });
  },

  // Delete homework
  deleteHomework: async (homeworkId) => {
    return apiCall(`/teacher/homework/${homeworkId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Parent API - Parent-specific endpoints
 */
export const parentAPI = {
  // Parent login
  parentLogin: async (phone, password) => {
    return apiCall('/auth/parent-login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  // Get children linked to parent account
  getChildren: async (parentUserId) => {
    return apiCall(`/parent/children/${parentUserId}`, {
      method: 'GET',
    });
  },

  // Get child's attendance data
  getAttendance: async (parentUserId) => {
    return apiCall(`/parent/attendance/${parentUserId}`, {
      method: 'GET',
    });
  },

  // Get child's fees data
  getFees: async (parentUserId) => {
    return apiCall(`/parent/fees/${parentUserId}`, {
      method: 'GET',
    });
  },

  // Get child's homework assignments
  getHomework: async (parentUserId) => {
    return apiCall(`/parent/homework/${parentUserId}`, {
      method: 'GET',
    });
  },

  // Get child's performance metrics
  getPerformance: async (parentUserId) => {
    return apiCall(`/parent/performance/${parentUserId}`, {
      method: 'GET',
    });
  },

  // Get teacher messages
  getMessages: async (parentUserId) => {
    return apiCall(`/parent/messages/${parentUserId}`, {
      method: 'GET',
    });
  },

  // Send message to teacher
  sendMessage: async (parentUserId, teacherId, message) => {
    return apiCall('/parent/messages/send', {
      method: 'POST',
      body: JSON.stringify({ parentUserId, teacherId, message }),
    });
  },
};

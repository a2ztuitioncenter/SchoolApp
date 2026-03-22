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

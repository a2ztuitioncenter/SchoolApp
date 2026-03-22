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

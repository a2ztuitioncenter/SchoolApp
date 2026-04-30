import { apiClient } from './apiClient';

const loginRouteByRole = {
  student: '/auth/login',
  teacher: '/auth/teacher-login',
  admin: '/auth/admin-login'
};

export const authService = {
  async login({ role, identifier, password }) {
    const endpoint = loginRouteByRole[role];
    if (!endpoint) {
      return { success: false, error: 'Invalid role selected' };
    }

    const payload =
      role === 'student'
        ? { identifier, dateOfBirth: password }
        : { identifier, password };

    const result = await apiClient(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!result.success) return result;

    const user = result.data?.user || {};
    return {
      success: true,
      data: {
        isLoggedIn: true,
        role,
        userId: user.id || user.userId || result.data?.userId,
        name: user.name || result.data?.name || '',
        phone: user.phone || ''
      }
    };
  },

  async verify() {
    return apiClient('/auth/verify', { method: 'POST' });
  },

  async logout() {
    return apiClient('/auth/logout', { method: 'POST' });
  }
};

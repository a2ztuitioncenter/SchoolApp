import { apiClient } from './apiClient';

export const adminService = {
  getDashboardSummary() {
    return apiClient('/admin/stats/summary', { method: 'GET' });
  },
  getUsers() {
    return apiClient('/admin/users', { method: 'GET' });
  },
  getStudents() {
    return apiClient('/admin/students', { method: 'GET' });
  }
};

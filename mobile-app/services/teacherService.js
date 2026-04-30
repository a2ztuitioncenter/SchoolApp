import { apiClient } from './apiClient';

export const teacherService = {
  getDashboard() {
    return apiClient('/teacher/dashboard/me', { method: 'GET' });
  },
  getHomework() {
    return apiClient('/teacher/homework', { method: 'GET' });
  },
  getMaterials() {
    return apiClient('/materials', { method: 'GET' });
  }
};

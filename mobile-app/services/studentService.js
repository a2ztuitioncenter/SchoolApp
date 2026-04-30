import { apiClient } from './apiClient';

export const studentService = {
  getDashboard() {
    return apiClient('/student/me/dashboard', { method: 'GET' });
  },
  getMaterials() {
    return apiClient('/materials', { method: 'GET' });
  },
  getSubmissions() {
    return apiClient('/submissions/student/me', { method: 'GET' });
  },
  getAssignments() {
    return apiClient('/assignments/active', { method: 'GET' });
  },
  submitAssignment(formData) {
    return apiClient('/submissions', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  }
};

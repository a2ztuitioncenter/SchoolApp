import { apiClient } from './apiClient';

export const teacherService = {
  async getDashboard(teacherId) {
    return apiClient(`/teacher/dashboard/${teacherId}`);
  },

  async getMaterials(teacherId) {
    return apiClient(`/teacher/materials/${teacherId}`);
  },

  async getAttendanceClasses(teacherId) {
    return apiClient(`/teacher/attendance-classes/${teacherId}`);
  },

  async getSectionsByClass(classLevel) {
    return apiClient(`/teacher/sections/${classLevel}`);
  },

  async getAttendanceSheet(teacherId, classLevel, date, section = '') {
    return apiClient(`/teacher/attendance-sheet/${teacherId}/${classLevel}/${date}${section ? `?section=${section}` : ''}`);
  },

  async markBulkAttendance(teacherId, records) {
    return apiClient('/teacher/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify({ teacherId, records })
    });
  },

  async createHomework(formData) {
    return apiClient('/teacher/homework', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  },

  async getSubmissions(teacherId) {
    return apiClient(`/teacher/submissions/${teacherId}`);
  },

  async reviewSubmission(submissionId, payload) {
    return apiClient(`/teacher/submissions/${submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getSubjects() {
    return apiClient('/subjects/teacher');
  }
};

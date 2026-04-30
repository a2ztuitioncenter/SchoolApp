import { apiClient } from './apiClient';

export const studentService = {
  async getDashboard(userId) {
    return apiClient(`/student/dashboard/${userId}`);
  },

  async getSyllabus(userId) {
    return apiClient(`/student/syllabus/${userId}`);
  },

  async getMaterials(classLevel, section = '') {
    return apiClient(`/materials/class/${classLevel}${section ? `?section=${section}` : ''}`);
  },

  async getSubjects(classLevel, section = '') {
    return apiClient(`/subjects/class/${classLevel}${section ? `?section=${section}` : ''}`);
  },

  async getSubmissions(userId) {
    return apiClient(`/student/submissions/${userId}`);
  },

  async submitAssignment(formData) {
    return apiClient('/student/submit-homework', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  },

  async getTimetable(classLevel, section = '') {
    // Check if there is a specific endpoint for timetable or if it's in dashboard
    return apiClient(`/student/timetable/${classLevel}${section ? `?section=${section}` : ''}`);
  }
};

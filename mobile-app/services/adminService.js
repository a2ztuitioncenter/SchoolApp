import { apiClient } from './apiClient';

export const adminService = {
  async getDashboardSummary() {
    return apiClient('/admin/dashboard-summary');
  },

  async getStudents() {
    return apiClient('/admin/students');
  },

  async getTeachers() {
    return apiClient('/admin/teachers');
  },

  async getPendingApprovals() {
    return apiClient('/admin/pending-approvals');
  },

  async approveUser(userId, role) {
    return apiClient(`/admin/approve-user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ role })
    });
  },

  async deleteUser(userId) {
    return apiClient(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },

  async getClasses() {
    return apiClient('/admin/classes');
  },

  async getSections(classLevel) {
    return apiClient(`/admin/sections/${classLevel}`);
  },

  async getFinancialSummary() {
    return apiClient('/admin/financial-summary');
  },

  async getUnpaidFees() {
    return apiClient('/admin/unpaid-fees');
  }
};

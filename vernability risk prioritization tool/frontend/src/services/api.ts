import axios from 'axios';
import {
  User, Asset, Vulnerability, RiskBreakdown, RemediationTask,
  NotificationItem, AuditLogItem, KPISummary
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vrpt_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('vrpt_token');
      localStorage.removeItem('vrpt_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  auth: {
    login: async (formData: FormData) => {
      const res = await apiClient.post<{ access_token: string; token_type: string; user: User }>(
        '/auth/login',
        formData,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return res.data;
    },
    register: async (userData: any) => {
      const res = await apiClient.post<User>('/auth/register', userData);
      return res.data;
    },
    getMe: async () => {
      const res = await apiClient.get<User>('/auth/me');
      return res.data;
    },
  },

  // Dashboard
  dashboard: {
    getSummary: async () => (await apiClient.get<KPISummary>('/dashboard/summary')).data,
    getSeverityDistribution: async () => (await apiClient.get<any[]>('/dashboard/severity-distribution')).data,
    getRiskTrends: async () => (await apiClient.get<any[]>('/dashboard/risk-trends')).data,
    getTopRisks: async (limit = 10) => (await apiClient.get<Vulnerability[]>(`/dashboard/top-risks?limit=${limit}`)).data,
    getAssetDistribution: async () => (await apiClient.get<any[]>('/dashboard/asset-distribution')).data,
    getRemediationProgress: async () => (await apiClient.get<any>('/dashboard/remediation-progress')).data,
    getRecentActivities: async () => (await apiClient.get<any[]>('/dashboard/recent-activities')).data,
  },

  // Vulnerabilities
  vulnerabilities: {
    list: async (params?: any) => (await apiClient.get<Vulnerability[]>('/vulnerabilities', { params })).data,
    get: async (id: number) => (await apiClient.get<{ vulnerability: Vulnerability; breakdown: RiskBreakdown; history: any[]; remediation_tasks: any[] }>(`/vulnerabilities/${id}`)).data,
    create: async (data: any) => (await apiClient.post<Vulnerability>('/vulnerabilities', data)).data,
    update: async (id: number, data: any) => (await apiClient.put<Vulnerability>(`/vulnerabilities/${id}`, data)).data,
    delete: async (id: number) => (await apiClient.delete(`/vulnerabilities/${id}`)).data,
  },

  // Assets
  assets: {
    list: async (params?: any) => (await apiClient.get<Asset[]>('/assets', { params })).data,
    get: async (id: number) => (await apiClient.get<{ asset: Asset; vulnerabilities: Vulnerability[] }>(`/assets/${id}`)).data,
    create: async (data: any) => (await apiClient.post<Asset>('/assets', data)).data,
    update: async (id: number, data: any) => (await apiClient.put<Asset>(`/assets/${id}`, data)).data,
    delete: async (id: number) => (await apiClient.delete(`/assets/${id}`)).data,
  },

  // Risk Prioritization
  risk: {
    getPrioritized: async (params?: any) => (await apiClient.get<{ top_immediate_attention: Vulnerability[]; total_count: number; items: { rank: number; vulnerability: Vulnerability }[] }>('/risk/prioritized', { params })).data,
    getBreakdown: async (id: number) => (await apiClient.get<RiskBreakdown>(`/risk/breakdown/${id}`)).data,
    calculateSingle: async (id: number) => (await apiClient.post<RiskBreakdown>(`/risk/calculate/${id}`)).data,
    recalculateAll: async () => (await apiClient.post<{ message: string }>('/risk/recalculate-all')).data,
    getConfig: async () => (await apiClient.get<any>('/risk/config')).data,
    updateConfig: async (weights: any) => (await apiClient.put<any>('/risk/config', weights)).data,
  },

  // Remediation
  remediation: {
    list: async (params?: any) => (await apiClient.get<RemediationTask[]>('/remediation', { params })).data,
    getOverdue: async () => (await apiClient.get<RemediationTask[]>('/remediation/overdue')).data,
    create: async (data: any) => (await apiClient.post<RemediationTask>('/remediation', data)).data,
    update: async (id: number, data: any) => (await apiClient.put<RemediationTask>(`/remediation/${id}`, data)).data,
    verifyAndClose: async (id: number) => (await apiClient.post<RemediationTask>(`/remediation/${id}/verify`)).data,
  },

  // Import
  importExport: {
    previewCsv: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    uploadCsv: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    sampleCsvUrl: `${API_BASE_URL}/import/sample-csv`,
  },

  // Reports
  reports: {
    exportCsvUrl: `${API_BASE_URL}/reports/export/csv`,
    exportPdfUrl: `${API_BASE_URL}/reports/export/pdf`,
  },

  // Notifications
  notifications: {
    list: async () => (await apiClient.get<NotificationItem[]>('/notifications')).data,
    markRead: async (id: number) => (await apiClient.put<NotificationItem>(`/notifications/${id}/read`)).data,
    markAllRead: async () => (await apiClient.put<{ message: string }>('/notifications/read-all')).data,
  },

  // Audit Logs
  audit: {
    list: async (params?: any) => (await apiClient.get<AuditLogItem[]>('/audit-logs', { params })).data,
  },
};

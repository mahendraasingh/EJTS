import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quiz_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle token expiration
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      if (localStorage.getItem('quiz_token')) {
        localStorage.removeItem('quiz_token');
        localStorage.removeItem('quiz_user');
        window.location.href = '/login?expired=true';
      }
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// =============================================================================
// API Service Methods
// =============================================================================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

export const quizAPI = {
  getAll: (params) => api.get('/quizzes', { params }),
  getById: (quizId) => api.get(`/quizzes/${quizId}`),
  getCategories: () => api.get('/quizzes/categories'),
  getQuestions: (quizId) => api.get(`/quizzes/${quizId}/questions`),
  create: (quizData) => api.post('/quizzes', quizData),
  update: (quizId, updates) => api.put(`/quizzes/${quizId}`, updates),
  delete: (quizId) => api.delete(`/quizzes/${quizId}`),
  addQuestion: (quizId, questionData) => api.post(`/quizzes/${quizId}/questions`, questionData),
  deleteQuestion: (questionId, quizId) => api.delete(`/quizzes/questions/${questionId}`, { params: { quizId } }),
};

export const attemptAPI = {
  joinQuiz: (quizId) => api.post(`/attempts/${quizId}/join`),
  recordAnswer: (quizId, payload) => api.post(`/attempts/${quizId}/answer`, payload),
  submitQuiz: (quizId, payload) => api.post(`/attempts/${quizId}/submit`, payload),
  getResult: (quizId) => api.get(`/attempts/${quizId}/result`),
};

export const leaderboardAPI = {
  getQuizLeaderboard: (quizId, limit = 10) => api.get(`/leaderboard/${quizId}`, { params: { limit } }),
  getMyRank: (quizId) => api.get(`/leaderboard/${quizId}/me`),
};

export const analyticsAPI = {
  getMyHistory: () => api.get('/analytics/my-history'),
  getMyPerformance: () => api.get('/analytics/my-performance'),
  getAdminOverview: () => api.get('/analytics/admin/overview'),
  getQuizAnalytics: (quizId) => api.get(`/analytics/admin/quizzes/${quizId}`),
  getCategoryPerformance: () => api.get('/analytics/admin/categories'),
  getAllStudents: () => api.get('/analytics/admin/students'),
};

export default api;


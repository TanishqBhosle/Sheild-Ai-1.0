import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = error.message;
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    const enhancedError = new Error(errorMessage);
    return Promise.reject(enhancedError);
  }
);

export const moderationApi = {
  moderate: async (content: string, type: 'text' | 'image' | 'video' = 'text', sourceUrl?: string) => {
    const response = await api.post('/moderate', { content, type, sourceUrl });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
  updateStatus: async (submissionId: string, status: 'approved' | 'rejected' | 'flagged', feedback?: { accuracy: string, note: string }) => {
    const response = await api.patch(`/queue/${submissionId}`, { status, feedback });
    return response.data;
  }
};

export default api;

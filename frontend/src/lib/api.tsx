import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '';
const baseURL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const client = axios.create({ baseURL });

client.interceptors.request.use(cfg => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export interface User { id: number; username: string; grade?: number; current_score: number; mastery_avg: number; weak_ratio: number; created_at: string; }
export interface Config { config_id: number; user_id: number; subject: string; grade: number; mode: string; target_score: number; daily_study_time: number; }
export interface Question { id: number; content: string; option_a?: string; option_b?: string; option_c?: string; option_d?: string; topic_id?: number; }
export interface TestOut { test_id: number; questions: Question[]; }
export interface TestResult { test_id: number; total_questions: number; correct_count: number; score: number; results: any[]; weak_topics: string[]; }
export interface Roadmap { roadmap_id: number; scenarios: any[]; ai_advisor_message: string; }

export const api = {
  ping: () => {
    const healthUrl = BACKEND_URL ? `${BACKEND_URL}/health` : '/health';
    return axios.get(healthUrl, { timeout: 10000 });
  },
  signup: (username: string, password: string) =>
    client.post('/auth/signup', { username, password }),
  login: (username: string, password: string) =>
    client.post('/auth/login', { username, password }),

  saveConfig: (userId: number, data: { subject: string; grade: number; mode: string; target_score: number; daily_study_time: number }) =>
    client.post(`/config/${userId}`, data),
  getConfig: (userId: number) =>
    client.get(`/config/${userId}`),

  generateTest: (subject: string, grade: number, topic?: string) =>
    client.get<TestOut>('/tests/generate', { params: { subject, grade, limit: 10, ...(topic ? { topic } : {}) } }),
  generateMiniTest: (
    subject: string,
    grade: number,
    topic: string,
    userId: number,
    week?: number,
  ) =>
    client.get<TestOut>('/tests/generate_mini', {
      params: { subject, grade, topic, user_id: userId, limit: 5, ...(week !== undefined ? { week } : {}) },
      timeout: 60000,
    }),
  submitTest: (
    userId: number,
    testId: number,
    answers: { question_id: number; selected_answer: string }[],
    extras?: { week?: number; topic_name?: string; is_mini_test?: boolean }
  ) =>
    client.post<TestResult>(
      `/tests/submit`,
      { test_id: testId, answers, ...(extras || {}) },
      { params: { user_id: userId } }
    ),

  generateRoadmap: (userId: number, data: any) =>
    client.post(`/roadmap/generate/${userId}`, data),
  selectRoadmap: (roadmapId: number, scenarioName: string, durationWeeks?: number) =>
    client.post(`/roadmap/select/${roadmapId}`, null, { params: { scenario_name: scenarioName, duration_weeks: durationWeeks } }),
  getRoadmapPlan: (roadmapId: number) =>
    client.get(`/roadmap/plan/${roadmapId}`),
  getLatestRoadmap: (userId: number) =>
    client.get(`/roadmap/latest/${userId}`),

  chat: (message: string, userContext: object) =>
    client.post('/chat/', { message, user_context: userContext }),

  getDashboard: (userId: number) =>
    client.get(`/dashboard/${userId}`),
  getUser: (userId: number) =>
    client.get<User>(`/users/${userId}`),
  uploadAvatar: (userId: number, avatarData: string) =>
    client.post(`/users/${userId}/avatar`, { avatar_data: avatarData }),
  getAvatar: (userId: number) =>
    client.get<{ avatar_data: string }>(`/users/${userId}/avatar`),
};

export default api;

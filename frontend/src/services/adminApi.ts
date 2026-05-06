import axios from "axios";

const API_BASE = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || "http://localhost:3302";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Key": import.meta.env.VITE_ADMIN_API_KEY || "",
  },
});

export interface Session {
  _id: string;
  receiptNo: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  counselor: {
    organization: string;
    name: string;
  };
  kid: {
    name: string;
    sex: string;
    birth: string;
  };
  score: number;
  figures: Record<string, any[]>;
  positions: any;
  llmCompletion: Record<string, any>;
  chatHistory?: any[];
  scripts?: Array<{ bot?: string; user?: string; button?: string; image?: string }>;
  report?: string;
  canvasImage?: string;
  dollInstances?: Array<{
    dollModel: string;
    label: string;
    pose: string;
    rotation: number;
    position: { x: number; y: number; z: number };
    size: number;
  }>;
  aiEvaluation?: string;
  familyType?: string;
  currentStep?: number;
  loginCode?: string;
  abuse?: Record<string, number>;
  tension?: string;
  abuser?: Record<string, number>;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Statistics {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  avgScore: number | null;
  maxScore: number | null;
  minScore: number | null;
  scoreDistribution: any[];
  monthlyStats: any[];
}

export const adminApi = {
  // Get sessions with pagination
  getSessions: async (page = 1, limit = 20): Promise<SessionListResponse> => {
    const response = await api.get(`/admin/sessions?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get session detail
  getSession: async (receiptNo: string): Promise<{ session: Session }> => {
    const response = await api.get(`/admin/sessions/${receiptNo}`);
    return response.data;
  },

  // Search sessions
  searchSessions: async (
    filters: {
      kidName?: string;
      organization?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
    page = 1,
    limit = 20
  ): Promise<SessionListResponse> => {
    const response = await api.post(`/admin/sessions/search?page=${page}&limit=${limit}`, filters);
    return response.data;
  },

  // Get statistics
  getStatistics: async (year?: number): Promise<Statistics> => {
    const url = year ? `/admin/statistics?year=${year}` : "/admin/statistics";
    const response = await api.get(url);
    return response.data;
  },

  // Delete session
  deleteSession: async (receiptNo: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/sessions/${receiptNo}`);
    return response.data;
  },

  // Regenerate report
  regenerateReport: async (receiptNo: string): Promise<{ success: boolean; message: string; report: string; score: number }> => {
    const response = await api.post(`/admin/sessions/${receiptNo}/regenerate-report`);
    return response.data;
  },

  // Save AI evaluation
  saveEvaluation: async (receiptNo: string, aiEvaluation: string, familyType?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.put(`/admin/sessions/${receiptNo}/evaluation`, { aiEvaluation, familyType });
    return response.data;
  },

  // Get user usage stats
  getUsers: async (): Promise<{ users: Array<{ email: string; name: string; organization: string; sessionCount: number; lastUsed: string }> }> => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  // Create user (admin only)
  createUser: async (email: string, name: string, organization: string) => {
    const res = await api.post("/admin/users", { email, name, organization });
    return res.data;
  },

  // Delete user (admin only)
  deleteUser: async (email: string) => {
    const res = await api.post("/admin/users/delete", { email });
    return res.data;
  },

  // Update user (admin only)
  updateUser: async (email: string, data: { name?: string; organization?: string; credits?: number }) => {
    const res = await api.put("/admin/users/update", { email, ...data });
    return res.data;
  },

  // Get sessions by counselor email (public endpoint - no admin key)
  getMySessions: async (email: string, page = 1, limit = 20): Promise<SessionListResponse> => {
    const response = await axios.get(`${API_BASE}/public/my-sessions?email=${encodeURIComponent(email)}&page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get session detail for session owner (public endpoint - no admin key)
  getMySession: async (receiptNo: string, email: string): Promise<{ session: Session }> => {
    const response = await axios.get(`${API_BASE}/public/my-session/${receiptNo}?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; database: string; sessions_count: number }> => {
    const response = await api.get("/admin/health");
    return response.data;
  },

  // Get credits
  getCredits: async (email: string): Promise<{ email: string; credits: number }> => {
    const response = await api.get(`/admin/credits?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  // Set credits (admin)
  setCredits: async (email: string, credits: number): Promise<{ email: string; credits: number }> => {
    const response = await api.put("/admin/credits", { email, credits });
    return response.data;
  },

  // Generate one-time code
  generateCode: async (email: string, name: string, organization: string, expiryHours: number | null = 24): Promise<{ code: string; credits: number }> => {
    const response = await api.post("/admin/generate-code", { email, name, organization, expiryHours });
    return response.data;
  },

  // Validate code (public API)
  validateCode: async (code: string): Promise<{ valid: boolean; counselorEmail?: string; counselorName?: string; organization?: string; message?: string; used?: boolean; sessionReceiptNo?: string }> => {
    const response = await axios.post(`${API_BASE}/public/validate-code`, { code });
    return response.data;
  },

  // Use code (public API)
  useCode: async (code: string, receiptNo: string): Promise<{ success: boolean }> => {
    const response = await axios.post(`${API_BASE}/public/use-code`, { code, receiptNo });
    return response.data;
  },

  // Get user info (public API)
  getUserInfo: async (email: string): Promise<{ exists: boolean; name?: string; organization?: string; credits?: number }> => {
    const response = await axios.get(`${API_BASE}/public/user-info?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  // Register user (public API)
  registerUser: async (email: string, name: string, organization: string): Promise<{ email: string; name: string; organization: string; credits: number; isNew: boolean }> => {
    const response = await axios.post(`${API_BASE}/public/register-user`, { email, name, organization });
    return response.data;
  },

  // Verify password (public API)
  verifyPassword: async (email: string, password: string): Promise<{ valid: boolean; passwordChanged?: boolean }> => {
    const response = await axios.post(`${API_BASE}/public/verify-password`, { email, password });
    return response.data;
  },

  // Change password (public API)
  changePassword: async (email: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.put(`${API_BASE}/public/change-password`, { email, oldPassword, newPassword });
    return response.data;
  },

  // Get my codes
  getMyCodes: async (email: string): Promise<{ codes: Array<{ code: string; used: boolean; createdAt: string; usedAt?: string; sessionReceiptNo?: string }> }> => {
    const response = await api.get(`/admin/my-codes?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  // Request expert evaluation (public API)
  requestEvaluation: async (receiptNo: any, requestedBy: string): Promise<{ success: boolean }> => {
    const response = await axios.post(`${API_BASE}/public/request-evaluation`, { receiptNo, requestedBy });
    return response.data;
  },

  // Check if evaluations arrived (public API)
  checkEvaluations: async (email: string): Promise<{ hasNew: boolean; sessions: Array<{ receiptNo: any; kidName: string; familyType: string; aiEvaluation: string }> }> => {
    const response = await axios.get(`${API_BASE}/public/check-evaluations?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  // Mark evaluations as notified (public API)
  markEvaluationNotified: async (receiptNos: any[]): Promise<{ success: boolean }> => {
    const response = await axios.post(`${API_BASE}/public/mark-evaluation-notified`, { receiptNos });
    return response.data;
  },

  // Generate AI clinical interpretation
  generateInterpretation: async (receiptNo: string, model: string = "claude") => {
    const res = await api.post(`/admin/sessions/${receiptNo}/interpretation?model=${model}`);
    return res.data;
  },

  // Save therapist interpretation
  saveTherapistInterpretation: async (receiptNo: string, interpretation: string) => {
    const res = await api.put(`/admin/sessions/${receiptNo}/interpretation`, { interpretation });
    return res.data;
  },

  // Get interpretation
  getInterpretation: async (receiptNo: string) => {
    const res = await api.get(`/admin/sessions/${receiptNo}/interpretation`);
    return res.data;
  },

  // Get super users list
  getSuperUsers: async (): Promise<{ superUsers: string[] }> => {
    const response = await api.get("/admin/super-users");
    return response.data;
  },

  // Update super user (add/remove)
  updateSuperUser: async (email: string, action: "add" | "remove"): Promise<{ success: boolean; superUsers: string[] }> => {
    const response = await api.put("/admin/super-users", { email, action });
    return response.data;
  },

  // Get super users (public API - no admin key)
  getPublicSuperUsers: async (): Promise<{ superUsers: string[] }> => {
    const response = await axios.get(`${API_BASE}/public/super-users`);
    return response.data;
  },

  // Get app settings (admin)
  getSettings: async (): Promise<{ showResultToUser: boolean }> => {
    const response = await api.get("/admin/settings");
    return response.data;
  },

  // Update app settings (admin)
  updateSettings: async (settings: { showResultToUser?: boolean }): Promise<{ success: boolean; showResultToUser?: boolean }> => {
    const response = await api.put("/admin/settings", settings);
    return response.data;
  },
};

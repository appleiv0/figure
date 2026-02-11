import axios from "axios";

const API_BASE = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || "http://localhost:3302";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Key": import.meta.env.VITE_ADMIN_API_KEY || "change-this-in-production",
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

  // Health check
  healthCheck: async (): Promise<{ status: string; database: string; sessions_count: number }> => {
    const response = await api.get("/admin/health");
    return response.data;
  },
};

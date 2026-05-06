import { useState } from "react";
import { restTransport } from "../../utils/api";

const { post } = restTransport();

export interface SessionProgressData {
  progress: {
    stage: number;
    memberIndex: number;
    totalMembers: number;
    phase: 'stage_intro' | 'in_progress' | 'completed';
  };
  family_members: string[];
  figures: Record<string, any[]>;
  positions: any;
  status: string;
  kid: { name?: string; gender?: string; [k: string]: any };
}

export const useSessionProgress = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async (receiptNo: number | string): Promise<SessionProgressData | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await post('/public/session-progress', { receiptNo });
      return res.data as SessionProgressData;
    } catch (err: any) {
      console.error('fetchProgress error:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch progress');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchProgress, loading, error };
};

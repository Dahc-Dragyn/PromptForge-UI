// src/hooks/useRecentActivity.ts
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/apiClient';

export interface RecentVersion {
  promptId: string;
  version: number;
  promptText: string;
  commitMessage: string;
  createdAt: any;
  promptName?: string;
}

export const useRecentActivity = () => {
  const [recentVersions, setRecentVersions] = useState<RecentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!user) {
        setLoading(false);
        setRecentVersions([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // FIX: Corrected the API endpoint from /recent-activity to /recent-versions
        const data = await apiClient('/metrics/recent-versions');
        
        if (data && Array.isArray(data)) {
            const formattedData = data.map((item: any) => ({
                promptId: item.prompt_id,
                version: item.version,
                promptText: item.prompt_text,
                commitMessage: item.commit_message,
                createdAt: item.created_at,
            }));
            setRecentVersions(formattedData);
        } else {
            setRecentVersions([]);
        }

      } catch (err) {
        setError((err as Error).message || 'Failed to fetch recent activity.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, [user]);

  return { recentVersions, loading, error };
};
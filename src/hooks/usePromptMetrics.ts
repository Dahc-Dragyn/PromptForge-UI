// src/hooks/usePromptMetrics.ts
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authenticatedFetch } from '@/lib/api';

const API_METRICS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/metrics`;

// This interface now matches the final shape the widget needs,
// as our new API call will return all necessary data directly.
export interface TopPromptMetric {
  id: string;
  name: string;
  averageRating: number;
  ratingCount: number;
}

export const usePromptMetrics = () => {
  const { user } = useAuth();
  const [topPrompts, setTopPrompts] = useState<TopPromptMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTopPrompts = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- FIX: Call the correct, centralized backend endpoint ---
        const response = await authenticatedFetch(`${API_METRICS_URL}/prompts/top`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to fetch top prompts.');
        }
        const data = await response.json();

        // --- FIX: Map the API response to the expected frontend interface ---
        const formattedPrompts: TopPromptMetric[] = data.map((prompt: any) => ({
          id: prompt.prompt_id,
          name: prompt.name,
          averageRating: prompt.average_rating,
          ratingCount: prompt.rating_count,
        }));

        setTopPrompts(formattedPrompts);

      } catch (err: any) {
        console.error("Failed to fetch top prompts:", err);
        setError('Failed to load top prompts data.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopPrompts();

  }, [user]); // Rerun when user logs in

  return { topPrompts, loading, error };
};
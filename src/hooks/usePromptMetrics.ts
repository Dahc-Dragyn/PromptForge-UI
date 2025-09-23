// src/hooks/usePromptMetrics.ts
'use client';

import useSWR from 'swr';
import { authenticatedFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

// This now matches the HydratedTopPrompt shape expected by the widget
interface PromptMetric {
  id: string;
  name: string;
  averageRating: number | null; // Corrected property name
  ratingCount: number; // Corrected property name
}

const fetcher = (url: string): Promise<PromptMetric[]> => authenticatedFetch(url);

export const usePromptMetrics = () => {
  const { user } = useAuth();
  const swrKey = user ? '/metrics/prompts/top' : null;
  const { data, error, isLoading } = useSWR<PromptMetric[]>(swrKey, fetcher);

  return {
    topPrompts: data || [],
    isLoading,
    error,
  };
};
// src/hooks/usePromptMetrics.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

export interface PromptMetric {
  id: string;
  name: string;
  average_rating: number;
  execution_count: number;
}

// The local fetcher is no longer needed.
// SWR will use the global fetcher from AppCacheProvider.

export function useTopPrompts() {
  const { user } = useAuth();
  const userId = user?.uid;

  // API FIX: Added trailing slash
  const endpoint = '/metrics/prompts/all/';
  
  // CACHE KEY: Changed to the user-aware array pattern
  const key = userId ? [endpoint, userId] : null;

  // SWR now uses the global fetcher
  const { data, error } = useSWR<PromptMetric[]>(key);

  return {
    topPrompts: data,
    isLoading: !error && !data && !!userId, // This logic is correct
    isError: error,
  };
}
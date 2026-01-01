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

// FIX: Explicit fetcher to ensure Auth headers are passed correctly
const fetcher = async (key: [string, string]): Promise<PromptMetric[]> => {
  const [url] = key;
  const data = await apiClient.get<PromptMetric[]>(url);
  // Ensure we always return an array
  return Array.isArray(data) ? data : [];
};

export function useTopPrompts() {
  const { user } = useAuth();
  const userId = user?.uid;

  // FIX: REMOVED trailing slash. 
  // Named sub-paths in FastAPI (like /prompts/all) usually do not want a slash.
  const endpoint = '/metrics/prompts/all';
  
  // CACHE KEY: User-aware array pattern
  const key = userId ? [endpoint, userId] : null;

  // FIX: Pass the fetcher explicitly
  const { data, error } = useSWR<PromptMetric[]>(key, fetcher);

  return {
    topPrompts: data,
    isLoading: !error && !data && !!userId,
    isError: error,
  };
}
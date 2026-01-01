// src/hooks/usePromptRatings.ts
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';

interface PromptRating {
  id: string;
  version_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

// FIX: Added a fetcher so the request uses your authenticated apiClient
const fetcher = async (key: [string, string]): Promise<PromptRating[]> => {
  const [url] = key;
  const data = await apiClient.get<PromptRating[]>(url);
  return Array.isArray(data) ? data : [];
};

export function usePromptRatings(promptId: string | null) {
  const { user } = useAuth();

  // FIX 1: Removed "/api/v1" prefix. 
  // apiClient adds this automatically.
  // FIX 2: No trailing slash needed for ID-based sub-resources usually.
  const endpoint = `/prompts/${promptId}/ratings`;

  // Key includes User ID to ensure data is user-scoped
  const key = promptId && user ? [endpoint, user.uid] : null;

  // FIX 3: Passed the explicit 'fetcher' to ensure Auth headers are sent
  const { data, error, isLoading } = useSWR<PromptRating[]>(key, fetcher);

  return {
    ratings: data,
    isLoading,
    isError: error,
  };
}
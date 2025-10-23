// src/hooks/usePromptRatings.ts
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';

interface PromptRating {
  id: string;
  version_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export function usePromptRatings(promptId: string | null) {
  const { user } = useAuth();

  const endpoint = `/api/v1/prompts/${promptId}/ratings`;

  // Before (Incorrect): A key based only on promptId, not the user.
  // const key = promptId && userId ? `/prompts/${promptId}/ratings` : null;

  // After (Correct): A key that is unique for EACH prompt AND EACH user.
  const key = promptId && user ? [endpoint, user.uid] : null;

  // The local 'fetcher' is removed. The global fetcher is used.
  const { data, error, isLoading } = useSWR<PromptRating[]>(key);

  // The 'submitRating' function is temporarily removed. We will reimplement all
  // data mutations in Phase 2, once the read layer is 100% stable.

  return {
    ratings: data,
    isLoading,
    isError: error,
  };
}
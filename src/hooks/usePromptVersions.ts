// src/hooks/usePromptVersions.ts
import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';

// Local fetcher is no longer needed.
// We will use the global fetcher from AppCacheProvider.

export function usePromptVersions(promptId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  // API FIX: Added trailing slash
  const endpoint = `/prompts/${promptId}/versions/`;

  // CACHE KEY: Changed to the user-aware array pattern
  const key = promptId && userId ? [endpoint, userId] : null;

  // SWR now uses the global fetcher from AppCacheProvider
  const { data, error } = useSWR<PromptVersion[]>(key);

  const createVersion = async (
    prompt_text: string,
    commit_message?: string
  ): Promise<PromptVersion> => {
    if (!promptId || !userId) {
      throw new Error("Prompt ID and user authentication are required to create a new version.");
    }

    // API FIX: Use the 'endpoint' variable which has the trailing slash
    // The cast is still useful here as apiClient.post is generic
    const newVersion = (await apiClient.post(endpoint, {
      prompt_text,
      commit_message,
    })) as PromptVersion;

    // Mutate the user-specific key to update the list
    mutate(key);
    return newVersion;
  };

  return {
    versions: data,
    isLoading: !error && !data && !!key, // Correct loading state
    isError: error,
    createVersion,
  };
}
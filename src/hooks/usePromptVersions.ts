// src/hooks/usePromptVersions.ts
import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';

export function usePromptVersions(promptId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  // --- THIS IS THE FIX ---
  // The backend API route is /prompts/{id}/versions (no trailing slash)
  //
  const endpoint = `/prompts/${promptId}/versions`; // <-- TRAILING SLASH REMOVED

  const key = promptId && userId ? [endpoint, userId] : null;

  const { data, error } = useSWR<PromptVersion[]>(key);

  const createVersion = async (
    prompt_text: string,
    commit_message?: string
  ): Promise<PromptVersion> => {
    if (!promptId || !userId) {
      throw new Error("Prompt ID and user authentication are required to create a new version.");
    }

    // This also fixes the POST request, as it now uses the correct 'endpoint'
    const newVersion = (await apiClient.post(endpoint, {
      prompt_text,
      commit_message,
    })) as PromptVersion;

    mutate(key);
    return newVersion;
  };

  return {
    versions: data,
    isLoading: !error && !data && !!key,
    isError: error,
    createVersion,
  };
}
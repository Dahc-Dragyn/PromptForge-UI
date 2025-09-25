// src/hooks/usePromptVersions.ts
import useSWR, { useSWRConfig } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';

// --- Data Fetching Hook ---

const fetcher = (url: string) => apiClient.get<PromptVersion[]>(url);

export function usePromptVersions(promptId: string | null) {
  // Only fetch if promptId is not null
  const key = promptId ? `/prompts/${promptId}/versions` : null;
  const { data, error, isLoading } = useSWR<PromptVersion[]>(key, fetcher);

  return {
    versions: data,
    isLoading,
    isError: error,
  };
}

// --- Data Mutation Function ---

export function useVersionMutations() {
  const { mutate } = useSWRConfig();

  const createVersion = async (
    promptId: string,
    prompt_text: string,
    commit_message?: string
  ): Promise<PromptVersion> => {
    const newVersion = await apiClient.post<PromptVersion>(`/prompts/${promptId}/versions`, {
      prompt_text,
      commit_message,
    });
    
    // Trigger revalidation of the versions list for this specific prompt
    mutate(`/prompts/${promptId}/versions`);
    return newVersion;
  };

  return {
    createVersion,
  };
}
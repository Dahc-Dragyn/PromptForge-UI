// src/hooks/usePromptVersions.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';
import { mutate } from 'swr';

const fetcher = (url: string) => apiClient.get<PromptVersion[]>(url);

export function usePromptVersions(promptId: string | null) {
  const key = promptId ? `/prompts/${promptId}/versions` : null;
  const { data, error, isLoading } = useSWR<PromptVersion[]>(key, fetcher);

  const createVersion = async (
    prompt_text: string,
    commit_message?: string
  ): Promise<PromptVersion> => {
    if (!promptId) {
      throw new Error("Prompt ID is required to create a new version.");
    }
    const newVersion = await apiClient.post<PromptVersion>(`/prompts/${promptId}/versions`, {
      prompt_text,
      commit_message,
    });
    
    mutate(key); // Revalidate the versions list for this specific prompt
    return newVersion;
  };

  return {
    versions: data,
    isLoading,
    isError: error,
    createVersion,
  };
}
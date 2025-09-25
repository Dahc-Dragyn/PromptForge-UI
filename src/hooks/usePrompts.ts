// src/hooks/usePrompts.ts
import useSWR, { useSWRConfig } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';

// --- Data Fetching Hooks ---

const listFetcher = (url: string) => apiClient.get<Prompt[]>(url);
const singleFetcher = (url: string) => apiClient.get<Prompt>(url);

export function usePrompts() {
  const { data, error, isLoading } = useSWR<Prompt[]>('/prompts/', listFetcher);
  return { prompts: data, isLoading, isError: !!error };
}

// NEW HOOK FOR DETAIL PAGE
export function usePromptDetail(promptId: string | null) {
  const key = promptId ? `/prompts/${promptId}` : null;
  const { data, error, isLoading } = useSWR<Prompt>(key, singleFetcher);
  return { prompt: data, isLoading, isError: !!error };
}

// --- Data Mutation Functions ---

export function usePromptMutations() {
  const { mutate } = useSWRConfig();

  const createPrompt = async (
    name: string,
    task_description: string,
    initial_prompt_text: string
  ): Promise<Prompt> => {
    const newPrompt = await apiClient.post<Prompt>('/prompts/', {
      name,
      task_description,
      initial_prompt_text,
    });
    mutate('/prompts/');
    return newPrompt;
  };

  const updatePrompt = async (
    promptId: string,
    updateData: Partial<Pick<Prompt, 'name' | 'task_description'>>
  ): Promise<Prompt> => {
    const updatedPrompt = await apiClient.patch<Prompt>(`/prompts/${promptId}`, updateData);
    // Revalidate both the list and the specific detail views
    mutate('/prompts/');
    mutate(`/prompts/${promptId}`);
    return updatedPrompt;
  };

  const deletePrompt = async (promptId: string): Promise<void> => {
    await apiClient.del(`/prompts/${promptId}`);
    mutate('/prompts/');
  };

  return { createPrompt, updatePrompt, deletePrompt };
}
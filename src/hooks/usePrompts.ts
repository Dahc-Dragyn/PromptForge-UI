// src/hooks/usePrompts.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';

const listFetcher = (url: string) => apiClient.get<Prompt[]>(url);
const singleFetcher = (url: string) => apiClient.get<Prompt>(url);

export function usePrompts() {
  // CORRECTED: The path is now just '/prompts'. The proxy handles the rest.
  const { data, error, isLoading, mutate } = useSWR('/prompts', listFetcher);

  const createPrompt = async (promptData: Partial<Prompt>) => {
    // CORRECTED: The path is now just '/prompts'.
    const newPrompt = await apiClient.post<Prompt>('/prompts', promptData);
    if (newPrompt) {
      mutate(); // Re-fetch the list after creation
    }
    return newPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    // CORRECTED: The path is now just '/prompts/PROMPT_ID'.
    await apiClient.del(`/prompts/${promptId}`);
    mutate(); // Re-fetch the list after deletion
  };

  return {
    prompts: data,
    isLoading,
    isError: error,
    createPrompt,
    deletePrompt,
  };
}

export function usePrompt(promptId: string) {
  const { data, error, isLoading } = useSWR(
    // CORRECTED: The path is now just '/prompts/PROMPT_ID'.
    promptId ? `/prompts/${promptId}` : null,
    singleFetcher
  );

  return {
    prompt: data,
    isLoading,
    isError: error,
  };
}
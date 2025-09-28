// src/hooks/usePrompts.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';
import { mutate } from 'swr';

const listFetcher = (url: string) => apiClient.get<Prompt[]>(url);
const singleFetcher = (url: string) => apiClient.get<Prompt>(url);

export function usePrompts() {
  const { data, error, isLoading } = useSWR('/prompts', listFetcher);

  const createPrompt = async (promptData: { name: string; description: string; text: string; }) => {
    const newPrompt = await apiClient.post<Prompt>('/prompts', promptData);
    mutate('/prompts');
    return newPrompt;
  };

  const updatePrompt = async (promptId: string, updateData: Partial<Prompt>) => {
    const updatedPrompt = await apiClient.patch<Prompt>(`/prompts/${promptId}`, updateData);
    mutate('/prompts'); // Revalidate the list
    mutate(`/prompts/${promptId}`); // Revalidate the specific prompt
    return updatedPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    await apiClient.del(`/prompts/${promptId}`);
    mutate('/prompts');
  };

  return {
    prompts: data,
    isLoading,
    isError: error,
    createPrompt,
    updatePrompt,
    deletePrompt,
  };
}

export function usePromptDetail(promptId: string) {
  const { data, error, isLoading } = useSWR(
    promptId ? `/prompts/${promptId}` : null,
    singleFetcher
  );

  return {
    prompt: data,
    isLoading,
    isError: error,
  };
}
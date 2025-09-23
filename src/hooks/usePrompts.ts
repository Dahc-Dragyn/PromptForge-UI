// src/hooks/usePrompts.ts
'use client';

import useSWR from 'swr';
import { authenticatedFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

interface Prompt {
  id: string;
  name: string;
  description: string;
  is_archived: boolean;
  created_at: string; // Add created_at
  latest_version_text?: string; // Add latest version text
}

const fetcher = (url: string): Promise<Prompt[]> => authenticatedFetch(url);

export const usePrompts = () => {
  const { user } = useAuth();
  const swrKey = user ? '/prompts' : null;
  const { data, error, isLoading, mutate } = useSWR<Prompt[]>(swrKey, fetcher);

  const createPrompt = async (promptData: { name: string; description: string; prompt_text: string; }) => {
    const newPrompt = await authenticatedFetch('/prompts', {
      method: 'POST',
      body: JSON.stringify(promptData),
    });
    mutate((currentPrompts = []) => [newPrompt, ...currentPrompts], false);
    return newPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    await authenticatedFetch(`/prompts/${promptId}`, {
      method: 'DELETE',
    });
    mutate((currentPrompts = []) => currentPrompts.filter(p => p.id !== promptId), false);
  };

  return {
    prompts: data || [],
    isLoading,
    error,
    createPrompt,
    deletePrompt,
    mutate, // Ensure mutate is returned
  };
};
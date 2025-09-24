// src/hooks/usePrompts.ts
'use client';

import useSWR from 'swr';
// FIX: Change this import from '@/lib/api' to the correct '@/lib/apiClient'
import { authenticatedFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

interface Prompt {
  id: string;
  name: string;
  description: string;
  is_archived: boolean;
  created_at: string;
  latest_version_text?: string;
}

export const usePrompts = () => {
  const { user } = useAuth();
  const swrKey = user ? '/prompts' : null;
  const { data, error, isLoading, mutate } = useSWR<Prompt[]>(swrKey, authenticatedFetch, {
    shouldRetryOnError: false,
  });

  const createPrompt = async (promptData: { name: string; description: string; prompt_text: string; }) => {
    const newPrompt = await authenticatedFetch('/prompts', {
      method: 'POST',
      body: JSON.stringify(promptData),
    });
    mutate();
    return newPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    await authenticatedFetch(`/prompts/${promptId}`, {
      method: 'DELETE',
    });
    mutate();
  };

  return {
    prompts: data || [],
    isLoading,
    error,
    createPrompt,
    deletePrompt,
    mutate,
  };
};
// src/hooks/usePromptVersions.ts
'use client';

import useSWR from 'swr';
import { authenticatedFetch } from '@/lib/apiClient';

interface PromptVersion {
  id: string;
  version_number: number;
  prompt_text: string;
  commit_message: string;
  created_at: string;
}

interface PromptDetails {
    id: string;
    name: string;
    description: string;
}

const fetcher = (url: string) => authenticatedFetch(url);

export const usePromptVersions = (promptId: string | null) => {
  // Fetch prompt details, renaming 'mutate' to be specific
  const { 
    data: prompt, 
    error: promptError, 
    isLoading: isPromptLoading, 
    mutate: mutatePrompt 
  } = useSWR<PromptDetails>(
    promptId ? `/prompts/${promptId}` : null,
    fetcher
  );

  // Fetch prompt versions, renaming 'mutate' to be specific
  const { 
    data: versions, 
    error: versionsError, 
    isLoading: areVersionsLoading, 
    mutate: mutateVersions 
  } = useSWR<PromptVersion[]>(
    promptId ? `/prompts/${promptId}/versions` : null,
    fetcher
  );

  const createVersion = async (versionData: { prompt_text: string; commit_message: string; }) => {
    if (!promptId) throw new Error("Prompt ID is not available.");

    const newVersion = await authenticatedFetch(`/prompts/${promptId}/versions`, {
        method: 'POST',
        body: JSON.stringify(versionData),
    });

    // Revalidate just the versions list to show the new version
    mutateVersions();
    return newVersion;
  };

  return {
    prompt,
    versions: versions ? [...versions].sort((a, b) => b.version_number - a.version_number) : [],
    isLoading: isPromptLoading || areVersionsLoading,
    error: promptError || versionsError,
    createVersion,
    mutatePrompt, // FIX: Expose the mutate function for the prompt details
  };
};
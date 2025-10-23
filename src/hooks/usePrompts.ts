// src/hooks/usePrompts.ts
import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';

interface CreatePromptData {
  name: string;
  description: string;
  text: string;
}

// FIX: Fetcher now accepts the array key and extracts the URL
const listFetcher = async (key: [string, string]): Promise<Prompt[]> => {
  const [url] = key; // Extract the URL from the key array
  const prompts = (await apiClient.get(url)) as Prompt[];
  return (prompts || []).map((p) => ({ ...p, is_archived: p.is_archived ?? false }));
};

// FIX: Fetcher now accepts the array key and extracts the URL
const singleFetcher = async (key: [string, string]): Promise<Prompt> => {
  const [url] = key; // Extract the URL from the key array
  return (await apiClient.get(url)) as Prompt;
};

export function usePrompts(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = includeArchived ? '/prompts/?include_archived=true' : '/prompts/';
  const key = userId ? [endpoint, userId] : null; // Key remains an array

  // SWR call is unchanged, but listFetcher now handles the array key correctly
  const { data, error, mutate } = useSWR<Prompt[]>(key, listFetcher); // Pass listFetcher

  const revalidateAllLists = () => {
    if (!userId) return;
    globalMutate([`/prompts/`, userId]);
    globalMutate([`/prompts/?include_archived=true`, userId]);
  };

  // --- All mutation functions below are unchanged ---
  const createPrompt = async (promptData: CreatePromptData) => {
    if (!userId) throw new Error("User must be logged in.");
    const newPrompt = await apiClient.post<Prompt>('/prompts/', { /* ... */ }); // Correct path
    revalidateAllLists();
    return newPrompt;
  };

  const updatePrompt = async (promptId: string, promptData: { name?: string; task_description?: string }) => {
    if (!userId) throw new Error("User must be logged in.");
    const updatedPrompt = await apiClient.patch<Prompt>(`/prompts/${promptId}/`, promptData); // Correct path
    revalidateAllLists();
    globalMutate([`/prompts/${promptId}/`, userId]);
    return updatedPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    if (!userId) return;
    const currentData = data || []; // Use current data for revert
    const optimisticData = currentData.filter(p => p.id !== promptId);
    mutate(optimisticData, false);
    try {
      await apiClient.delete(`/prompts/${promptId}/`); // Correct path
      revalidateAllLists();
    } catch (e) {
      mutate(currentData, false); // Revert with original data
      throw e;
    }
  };

  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    if (!userId) return;
    const currentData = data || []; // Use current data for revert
    const optimisticData = currentData.map(p =>
      p.id === promptId ? { ...p, is_archived: isArchived } : p
    );
    mutate(optimisticData, false);
    try {
      await apiClient.patch<Prompt>(`/prompts/${promptId}/`, { is_archived: isArchived }); // Correct path
      revalidateAllLists();
    } catch (e) {
      mutate(currentData, false); // Revert with original data
      console.error("Failed to archive prompt:", e);
      throw e;
    }
  };

  const ratePrompt = async (promptId: string, versionNumber: number, rating: number) => {
    if (!userId) return;
    const currentData = data || []; // Use current data for revert
    const promptToRate = currentData.find(p => p.id === promptId);
    if (!promptToRate) return;
    const oldAvgRating = promptToRate.average_rating || 0;
    const oldRatingCount = promptToRate.rating_count || 0;
    const newRatingCount = oldRatingCount + 1;
    const newAvgRating = ((oldAvgRating * oldRatingCount) + rating) / newRatingCount;
    const optimisticData = currentData.map(p =>
        p.id === promptId
            ? { ...p, average_rating: newAvgRating, rating_count: newRatingCount }
            : p
    );
    mutate(optimisticData, false);
    try {
      await apiClient.post('/metrics/rate/', { /* ... */ }); // Correct path
      revalidateAllLists();
    } catch (e) {
      mutate(currentData, false); // Revert with original data
      console.error("Failed to submit rating:", e);
      throw e;
    }
  };

  return {
    prompts: data,
    isLoading: !error && !data && !!userId,
    isError: error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    archivePrompt,
    ratePrompt,
  };
}

export function usePromptDetail(promptId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = `/prompts/${promptId}/`;
  const key = promptId && userId ? [endpoint, userId] : null; // Key is correct array

  // SWR call is unchanged, but singleFetcher now handles the array key correctly
  const { data, error } = useSWR(key, singleFetcher); // Pass singleFetcher

  return {
    prompt: data,
    isLoading: !error && !data && !!key,
    isError: error,
  };
}
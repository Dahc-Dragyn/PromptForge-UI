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

  // *** FIX (308 Redirect): Removed trailing slash from '/prompts/' ***
  const endpoint = includeArchived ? '/prompts?include_archived=true' : '/prompts';
  const key = userId ? [endpoint, userId] : null; // Key remains an array

  // SWR call is unchanged, but listFetcher now handles the array key correctly
  const { data, error, mutate } = useSWR<Prompt[]>(key, listFetcher); // Pass listFetcher

  const revalidateAllLists = () => {
    if (!userId) return;
    // *** FIX (308 Redirect): Removed trailing slashes ***
    globalMutate([`/prompts`, userId]);
    globalMutate([`/prompts?include_archived=true`, userId]);
  };

  const createPrompt = async (promptData: CreatePromptData) => {
    if (!userId) throw new Error("User must be logged in.");

    // *** FIX (422 Error): Map frontend state to backend schema ***
    const apiPayload = {
      name: promptData.name,
      task_description: promptData.description,
      initial_prompt_text: promptData.text
    };

    // *** FIX (308 Redirect): Removed trailing slash from '/prompts/' ***
    const newPrompt = await apiClient.post<Prompt>('/prompts', apiPayload); 
    revalidateAllLists();
    return newPrompt;
  };

  const updatePrompt = async (promptId: string, promptData: { name?: string; task_description?: string }) => {
    if (!userId) throw new Error("User must be logged in.");
    // *** FIX (308 Redirect): Removed trailing slash ***
    const updatedPrompt = await apiClient.patch<Prompt>(`/prompts/${promptId}`, promptData);
    revalidateAllLists();
    // *** FIX (308 Redirect): Removed trailing slash ***
    globalMutate([`/prompts/${promptId}`, userId]);
    return updatedPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    if (!userId) return;
    const currentData = data || []; // Use current data for revert
    const optimisticData = currentData.filter(p => p.id !== promptId);
    mutate(optimisticData, false);
    try {
      // *** FIX (308 Redirect): Removed trailing slash ***
      await apiClient.delete(`/prompts/${promptId}`);
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
      // *** FIX (308 Redirect): Removed trailing slash ***
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });
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
    
    // *** FIX: Restored correct optimistic update logic ***
    const promptToRate = currentData.find(p => p.id === promptId);
    if (!promptToRate) return; // Should not happen if UI is correct

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
      // *** FIX (308 Redirect): Removed trailing slash ***
      // *** FIX (422 Error): Added correct payload ***
      await apiClient.post('/metrics/rate', {
        prompt_id: promptId,
        version_number: versionNumber,
        rating: rating
      });
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

  // *** FIX (308 Redirect): Removed trailing slash ***
  const endpoint = `/prompts/${promptId}`;
  const key = promptId && userId ? [endpoint, userId] : null; // Key is correct array

  // SWR call is unchanged, but singleFetcher now handles the array key correctly
  const { data, error } = useSWR(key, singleFetcher); // Pass singleFetcher

  return {
    prompt: data,
    isLoading: !error && !data && !!key,
    isError: error,
  };
}
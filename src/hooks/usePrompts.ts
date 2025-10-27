import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';
// Added AxiosResponse import if needed by apiClient typing
import { AxiosResponse } from 'axios';

interface CreatePromptData {
  name: string;
  task_description: string; // Aligned with API
  initial_prompt_text: string; // Aligned with API
}

// Fetcher for lists
const listFetcher = async (key: [string, string]): Promise<Prompt[]> => {
  const [url] = key;
  const response = await apiClient.get<Prompt[]>(url);
  const prompts = (response && 'data' in response) ? (response as AxiosResponse<Prompt[]>).data : (response as Prompt[]);
  return Array.isArray(prompts) ? prompts.map((p) => ({ ...p, is_archived: p.is_archived ?? false })) : [];
};

// Fetcher for single prompt
const singleFetcher = async (key: [string, string]): Promise<Prompt | null> => {
  const [url] = key;
  try {
    const response = await apiClient.get<Prompt>(url);
    const prompt = (response && 'data' in response) ? (response as AxiosResponse<Prompt>).data : (response as Prompt);
    return prompt;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};


export function usePrompts(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  // Endpoint and Key setup (no trailing slash for prompts list)
  const endpoint = includeArchived ? '/prompts?include_archived=true' : '/prompts';
  const key = userId ? [endpoint, userId] : null;

  // SWR hook using the listFetcher
  const { data, error, mutate } = useSWR<Prompt[]>(key, listFetcher);

  // Function to revalidate both list types globally
  const revalidateAllLists = () => {
    if (!userId) return;
    // Keys used for global mutation (no trailing slash)
    globalMutate([`/prompts`, userId]);
    globalMutate([`/prompts?include_archived=true`, userId]);
  };

  const createPrompt = async (promptData: CreatePromptData) => {
    if (!userId) throw new Error("User must be logged in.");
    const response = await apiClient.post<Prompt>('/prompts', promptData);
    const newPrompt = (response && 'data' in response) ? (response as AxiosResponse<Prompt>).data : (response as Prompt);
    revalidateAllLists();
    return newPrompt;
  };

  const updatePrompt = async (promptId: string, promptData: { name?: string; task_description?: string }) => {
    if (!userId) throw new Error("User must be logged in.");
    const response = await apiClient.patch<Prompt>(`/prompts/${promptId}`, promptData);
    const updatedPrompt = (response && 'data' in response) ? (response as AxiosResponse<Prompt>).data : (response as Prompt);
    globalMutate([`/prompts/${promptId}`, userId], updatedPrompt, { revalidate: false });
    revalidateAllLists();
    return updatedPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    if (!userId || !key) return;
    const currentData = data || [];
    const optimisticData = currentData.filter(p => p.id !== promptId);
    mutate(optimisticData, { revalidate: false });
    try {
      await apiClient.delete(`/prompts/${promptId}`);
      revalidateAllLists(); // Rely on global revalidation
    } catch (e) {
      mutate(currentData, { revalidate: false });
      console.error("Failed to delete prompt:", e);
      throw e;
    }
  };

  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    // Ensure user and the hook's key are available
    if (!userId || !key) return;

    const currentData = data || []; // Get current cached list data

    // --- REFINED OPTIMISTIC UPDATE ---
    // 1. Map to update the 'is_archived' status optimistically.
    // 2. Filter *after* mapping, only if the current view should hide archived items.
    const optimisticData = currentData
        .map(p => (p.id === promptId ? { ...p, is_archived: isArchived } : p))
        .filter(p => {
             // Keep the item if we *are* showing archived items,
             // OR if the item is *not* the one being archived,
             // OR if the item *is* the one being changed, but it's being *unarchived*.
            return includeArchived || p.id !== promptId || (p.id === promptId && !isArchived);
         });


    // Update the local cache optimistically, DO NOT REVALIDATE YET
    mutate(optimisticData, { revalidate: false });

    try {
      // Make the actual API call (no trailing slash for prompts)
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });

      // --- SIMPLIFIED REVALIDATION ---
      // Successfully updated backend. Now, trigger SWR to globally revalidate
      // both list keys (/prompts and /prompts?include_archived=true).
      // This ensures all potential views of the data are updated.
      revalidateAllLists();

    } catch (e) {
      // FAILURE: Revert the local cache to the original data, DO NOT REVALIDATE
      mutate(currentData, { revalidate: false });
      console.error("Failed to archive prompt:", e);
      // Re-throw the error
      throw e;
    }
  };

  const ratePrompt = async (promptId: string, versionNumber: number, rating: number) => {
    if (!userId || !key) return;
    const currentData = data || [];
    const promptToRate = currentData.find(p => p.id === promptId);

    // If prompt not in cache, skip optimistic update and just call API/revalidate
    if (!promptToRate) {
        console.warn("Prompt not found in cache for rating optimistic update.");
        try {
            await apiClient.post('/metrics/rate', { prompt_id: promptId, version_number: versionNumber, rating: rating });
            revalidateAllLists();
        } catch (e) {
             console.error("Failed to submit rating:", e);
             throw e;
        }
        return; // Exit function early
    }

    // Calculate new average rating optimistically
    const oldAvgRating = promptToRate.average_rating || 0;
    const oldRatingCount = promptToRate.rating_count || 0;
    const newRatingCount = oldRatingCount + 1;
    const newAvgRating = ((oldAvgRating * oldRatingCount) + rating) / newRatingCount;

    // Create optimistic data
    const optimisticData = currentData.map(p =>
        p.id === promptId
            ? { ...p, average_rating: newAvgRating, rating_count: newRatingCount }
            : p
    );
    // Update cache optimistically without refetching yet
    mutate(optimisticData, { revalidate: false });

    try {
      // API call to rate (no trailing slash)
      await apiClient.post('/metrics/rate', {
        prompt_id: promptId,
        version_number: versionNumber,
        rating: rating
      });
      // Revalidate lists after successful API call
      revalidateAllLists();
    } catch (e) {
      // Revert UI on failure
      mutate(currentData, { revalidate: false });
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

  // Endpoint and key for single prompt detail (no trailing slash)
  const endpoint = `/prompts/${promptId}`;
  const key = promptId && userId ? [endpoint, userId] : null;

  // SWR hook using the singleFetcher
  const { data, error, mutate } = useSWR(key, singleFetcher);

  return {
    prompt: data,
    isLoading: !error && !data && !!key,
    isError: error,
  };
}
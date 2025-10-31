import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';
// Re-adding this, as the original listFetcher used it.
import { AxiosResponse } from 'axios';

// --- FIX: This interface now matches what the UI components are sending ---
interface CreatePromptData {
  name: string;
  description: string; // <-- This was the UI field name
  text: string;        // <-- This was the UI field name
}

// Fetcher for lists
const listFetcher = async (key: [string, string]): Promise<Prompt[]> => {
  const [url] = key;
  // --- Reverting to original fetcher logic to be safe ---
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

  // --- THIS FIX IS KEPT ---
  // The 308 Redirects are gone, so this is correct. NO trailing slash.
  const endpoint = includeArchived ? '/prompts?include_archived=true' : '/prompts';
  const key = userId ? [endpoint, userId] : null;

  // SWR hook using the listFetcher
  const { data, error, mutate } = useSWR<Prompt[]>(key, listFetcher);

  // Function to revalidate both list types globally
  const revalidateAllLists = () => {
    if (!userId) return;
    // --- THIS FIX IS KEPT ---
    // NO trailing slash.
    globalMutate([`/prompts`, userId]);
    globalMutate([`/prompts?include_archived=true`, userId]);
  };

  // --- FIX: This function now accepts the UI's data shape and maps it ---
  const createPrompt = async (promptData: CreatePromptData) => {
    if (!userId) throw new Error("User must be logged in.");

    const apiPayload = {
      name: promptData.name,
      task_description: promptData.description,
      initial_prompt_text: promptData.text
    };

    // --- NOTE: POST for CREATE *does* use a trailing slash, per prompts.py ---
    const response = await apiClient.post<Prompt>('/prompts/', apiPayload); 
    
    const newPrompt = (response && 'data' in response) ? (response as AxiosResponse<Prompt>).data : (response as Prompt);
    revalidateAllLists();
    return newPrompt;
  };

  const updatePrompt = async (promptId: string, promptData: { name?: string; task_description?: string }) => {
    if (!userId) throw new Error("User must be logged in.");
    // No slash needed for specific resource
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
      // No slash needed for specific resource
      await apiClient.delete(`/prompts/${promptId}`);
      revalidateAllLists();
    } catch (e) {
      mutate(currentData, { revalidate: false });
      console.error("Failed to delete prompt:", e);
      throw e;
    }
  };

  // --- FINAL, PRODUCTION-GRADE FIX: "Manual Flash + Lazy Sync" ---
  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    if (!userId || !key) return;

    const currentData = data || [];

    // This is the data we *want* to see after the call succeeds.
    // This is the same filter logic from your file that produced the "flash".
    const finalData = currentData
        .map(p => (p.id === promptId ? { ...p, is_archived: isArchived } : p))
        .filter(p => {
            // This logic determines if the item should be in the *current* view
            return includeArchived || p.id !== promptId || (p.id === promptId && !isArchived);
         });

    try {
      // 1. Await the API call. No optimistic update.
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });
      
      // 2. SUCCESS! Now, "Manual Flash":
      //    Update the *current* list's cache manually.
      //    `revalidate: false` PREVENTS the race condition.
      mutate(finalData, { revalidate: false });

      // 3. "Lazy Sync":
      //    Find the *other* list (the one we're not looking at).
      const otherListKey = includeArchived 
            ? [`/prompts`, userId] 
            : [`/prompts?include_archived=true`, userId];
      
      //    Trigger a background refresh for that list, but
      //    delay it by 300ms to let Firestore's consistency catch up.
      setTimeout(() => {
        globalMutate(otherListKey);
      }, 300);

      // 4. Critically: DO NOT call revalidateAllLists() here.

    } catch (e) {
      // If the API call fails, we do nothing. The UI never flashed,
      // so no rollback is needed. Just log and throw.
      console.error("Failed to archive prompt:", e);
      throw e;
    }
  };
  // --- END FIX ---

  const ratePrompt = async (promptId: string, versionNumber: number, rating: number) => {
    if (!userId || !key) return;
    const currentData = data || [];
    const promptToRate = currentData.find(p => p.id === promptId);

    if (!promptToRate) {
        console.warn("Prompt not found in cache for rating optimistic update.");
        try {
            await apiClient.post('/metrics/rate', { prompt_id: promptId, version_number: versionNumber, rating: rating });
            revalidateAllLists();
        } catch (e) {
             console.error("Failed to submit rating:", e);
             throw e;
        }
        return;
    }

    const oldAvgRating = promptToRate.average_rating || 0;
    const oldRatingCount = promptToRate.rating_count || 0;
    const newRatingCount = oldRatingCount + 1;
    const newAvgRating = ((oldAvgRating * oldRatingCount) + rating) / newRatingCount;

    const optimisticData = currentData.map(p =>
        p.id === promptId
            ? { ...p, average_rating: newAvgRating, rating_count: newRatingCount }
            : p
    );
    mutate(optimisticData, { revalidate: false });

    try {
      await apiClient.post('/metrics/rate', {
        prompt_id: promptId,
        version_number: versionNumber,
        rating: rating
      });
      revalidateAllLists();
    } catch (e) {
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

  // No slash needed for specific resource
  const endpoint = `/prompts/${promptId}`;
  const key = promptId && userId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR(key, singleFetcher);

  return {
    prompt: data,
    isLoading: !error && !data && !!key,
    isError: error,
  };
}
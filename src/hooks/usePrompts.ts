import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';
// Added AxiosResponse import if needed by apiClient typing
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

  // --- KEPT FIX: Trailing slash is correct ---
  const endpoint = includeArchived ? '/prompts/?include_archived=true' : '/prompts/';
  const key = userId ? [endpoint, userId] : null;

  // SWR hook using the listFetcher
  const { data, error, mutate } = useSWR<Prompt[]>(key, listFetcher);

  // Function to revalidate both list types globally
  const revalidateAllLists = () => {
    if (!userId) return;
    // --- KEPT FIX: Trailing slash is correct ---
    globalMutate([`/prompts/`, userId]);
    globalMutate([`/prompts/?include_archived=true`, userId]);
  };

  // --- FIX: This function now accepts the UI's data shape and maps it ---
  const createPrompt = async (promptData: CreatePromptData) => {
    if (!userId) throw new Error("User must be logged in.");

    // --- This is the new mapping logic ---
    const apiPayload = {
      name: promptData.name,
      task_description: promptData.description, // Map description -> task_description
      initial_prompt_text: promptData.text       // Map text -> initial_prompt_text
    };
    // ------------------------------------

    // --- KEPT FIX: Trailing slash is correct ---
    // Now we send the correctly mapped apiPayload
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

  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    if (!userId || !key) return;

    const currentData = data || [];

    const optimisticData = currentData
        .map(p => (p.id === promptId ? { ...p, is_archived: isArchived } : p))
        .filter(p => {
            return includeArchived || p.id !== promptId || (p.id === promptId && !isArchived);
         });

    mutate(optimisticData, { revalidate: false });

    try {
      // No slash needed for specific resource
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });
      revalidateAllLists();

    } catch (e) {
      mutate(currentData, { revalidate: false });
      console.error("Failed to archive prompt:", e);
      throw e;
    }
  };

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
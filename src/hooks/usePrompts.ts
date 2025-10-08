import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';
import { useAuth } from '@/context/AuthContext';

interface CreatePromptData {
  name: string;
  description: string;
  text: string;
}

// FINAL FIX: The fetchers now correctly assume apiClient returns the data directly.
const listFetcher = async (url: string): Promise<Prompt[]> => {
    // apiClient's interceptor already returns the data array.
    const responseData = await apiClient.get<Prompt[]>(url);
    return (responseData || []).map(p => ({ ...p, is_archived: p.is_archived ?? false }));
};

const singleFetcher = async (url: string): Promise<Prompt> => {
    // apiClient's interceptor returns the Prompt object directly.
    return await apiClient.get<Prompt>(url);
};

export function usePrompts(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = includeArchived ? '/prompts?include_archived=true' : '/prompts';
  
  // The key for SWR is now user-specific.
  const key = userId ? [endpoint, userId] : null;
  
  const { data, error, isLoading, mutate } = useSWR<Prompt[]>(key, () => listFetcher(endpoint));

  // This function now revalidates the user-specific cache keys.
  const revalidateAllLists = () => {
    if (!userId) return;
    globalMutate([`/prompts`, userId]);
    globalMutate([`/prompts?include_archived=true`, userId]);
  };

  const createPrompt = async (promptData: CreatePromptData) => {
    if (!userId) throw new Error("User must be logged in.");
    // apiClient.post also returns the data object directly.
    const newPrompt = await apiClient.post<Prompt>('/prompts', {
      name: promptData.name,
      task_description: promptData.description,
      initial_prompt_text: promptData.text,
    });
    revalidateAllLists();
    return newPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    if (!userId) return;
    const optimisticData = (data || []).filter(p => p.id !== promptId);
    mutate(optimisticData, false);

    try {
      await apiClient.delete(`/prompts/${promptId}`);
      revalidateAllLists(); 
    } catch(e) {
      mutate(data, false);
      throw e;
    }
  };

  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    if (!userId) return;
    const currentData = data || [];
    
    const optimisticData = currentData.map(p =>
      p.id === promptId ? { ...p, is_archived: isArchived } : p
    );
    mutate(optimisticData, false);

    try {
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });
      revalidateAllLists();
    } catch (e) {
      mutate(currentData, false);
      console.error("Failed to archive prompt:", e);
      throw e;
    }
  };

  const ratePrompt = async (promptId: string, versionNumber: number, rating: number) => {
    if (!userId) return;
    const currentData = data || [];
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
      await apiClient.post('/metrics/rate', {
        prompt_id: promptId,
        version_number: versionNumber,
        rating: rating,
      });
      revalidateAllLists();
    } catch (e) {
      mutate(currentData, false);
      console.error("Failed to submit rating:", e);
      throw e;
    }
  };

  return {
    prompts: data,
    isLoading: !error && !data && !!userId,
    isError: error,
    createPrompt,
    deletePrompt,
    archivePrompt,
    ratePrompt,
  };
}

export function usePromptDetail(promptId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  const key = promptId && userId ? [`/prompts/${promptId}`, userId] : null;

  const { data, error, isLoading } = useSWR(
    key,
    () => singleFetcher(`/prompts/${promptId}`)
  );

  return {
    prompt: data,
    isLoading,
    isError: error,
  };
}
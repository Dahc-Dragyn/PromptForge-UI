import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';

interface CreatePromptData {
  name: string;
  description: string;
  text: string;
}

const listFetcher = async (url: string): Promise<Prompt[]> => {
    const response = await apiClient.get<Prompt[]>(url);
    return response.map(p => ({ ...p, is_archived: p.is_archived ?? false }));
};

const singleFetcher = (url: string) => apiClient.get<Prompt>(url);

export function usePrompts(includeArchived = false) {
  const endpoint = includeArchived ? '/prompts?include_archived=true' : '/prompts';
  
  const { data, error, isLoading, mutate: revalidatePrompts } = useSWR<Prompt[]>(endpoint, listFetcher);

  const revalidateAllLists = () => {
    mutate('/prompts');
    mutate('/prompts?include_archived=true');
  };

  const createPrompt = async (promptData: CreatePromptData) => {
    const newPrompt = await apiClient.post<Prompt>('/prompts', {
      name: promptData.name,
      task_description: promptData.description,
      initial_prompt_text: promptData.text,
    });
    revalidateAllLists();
    return newPrompt;
  };

  const deletePrompt = async (promptId: string) => {
    const optimisticData = (data || []).filter(p => p.id !== promptId);
    mutate(endpoint, optimisticData, false);

    try {
      await apiClient.del(`/prompts/${promptId}`);
      revalidatePrompts(); 
    } catch(e) {
      mutate(endpoint, data, false);
      throw e;
    }
  };

  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    const currentData = data || [];
    
    const optimisticData = currentData.map(p =>
      p.id === promptId ? { ...p, is_archived: isArchived } : p
    );
    mutate(endpoint, optimisticData, false);

    try {
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });
    } catch (e) {
      mutate(endpoint, currentData, false);
      console.error("Failed to archive prompt:", e);
      throw e;
    }
  };

  const ratePrompt = async (promptId: string, versionNumber: number, rating: number) => {
    const currentData = data || [];
    const promptToRate = currentData.find(p => p.id === promptId);
    if (!promptToRate) return;

    // Optimistic UI Update (remains the same)
    const oldAvgRating = promptToRate.average_rating || 0;
    const oldRatingCount = promptToRate.rating_count || 0;
    
    const newRatingCount = oldRatingCount + 1;
    const newAvgRating = ((oldAvgRating * oldRatingCount) + rating) / newRatingCount;

    const optimisticData = currentData.map(p =>
      p.id === promptId
        ? { ...p, average_rating: newAvgRating, rating_count: newRatingCount }
        : p
    );
    mutate(endpoint, optimisticData, false);

    try {
      await apiClient.post('/metrics/rate', {
        prompt_id: promptId,
        version_number: versionNumber,
        rating: rating, // <-- THE MISSING FIELD
      });
    } catch (e) {
      // Rollback on error
      mutate(endpoint, currentData, false);
      console.error("Failed to submit rating:", e);
      throw e;
    }
  };

  return {
    prompts: data,
    isLoading,
    isError: error,
    createPrompt,
    deletePrompt,
    archivePrompt,
    ratePrompt,
  };
}

export function usePromptDetail(promptId: string | null) {
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
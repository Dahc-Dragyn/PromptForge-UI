// src/hooks/usePrompts.ts
import useSWR, { mutate as globalMutate } from 'swr';
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

const singleFetcher = (url: string) => {
  if (url.includes('undefined')) {
    return Promise.reject(new Error(`Invalid fetch attempt to URL: ${url}`));
  }
  return apiClient.get<Prompt>(url);
};

export function usePrompts(includeArchived = false) {
  const endpoint = includeArchived ? '/prompts?include_archived=true' : '/prompts';
  const { data, error, isLoading, mutate } = useSWR<Prompt[]>(endpoint, listFetcher);

  const revalidateAll = () => {
    globalMutate('/prompts');
    globalMutate('/prompts?include_archived=true');
    globalMutate('/metrics/activity/recent');
    // Also revalidate individual prompt details if they are open
    if (data) {
      data.forEach(p => globalMutate(`/prompts/${p.id}`));
    }
  };

  const createPrompt = async (promptData: CreatePromptData) => {
    const newPrompt = await apiClient.post<Prompt>('/prompts', {
      name: promptData.name,
      task_description: promptData.description,
      initial_prompt_text: promptData.text,
    });
    revalidateAll();
    return newPrompt;
  };

  const updatePrompt = async (promptId: string, updateData: { name?: string; task_description?: string }) => {
    const apiCall = apiClient.patch<Prompt>(`/prompts/${promptId}`, updateData);

    const updater = (currentData: Prompt[] = []) =>
      currentData.map(p => (p.id === promptId ? { ...p, ...updateData } : p));

    // Update both list caches optimistically
    await globalMutate('/prompts?include_archived=true', updater, { revalidate: false });
    await globalMutate('/prompts', updater, { revalidate: false });
    
    // --- FIX IS HERE ---
    // Update the detail cache optimistically, with a guard for undefined.
    await globalMutate(`/prompts/${promptId}`, (currentPrompt: Prompt | undefined) => {
      if (!currentPrompt) return undefined; // Don't update if not in cache
      return { ...currentPrompt, ...updateData };
    }, { revalidate: false });

    try {
      await apiCall;
      revalidateAll(); // Revalidate all after success
    } catch (e) {
      revalidateAll(); // Revalidate to roll back on error
      throw e;
    }
  };

  const deletePrompt = async (promptId: string) => {
    const allPromptsKey = '/prompts?include_archived=true';
    const activePromptsKey = '/prompts';
    
    const originalAllData = await globalMutate(allPromptsKey);
    const originalActiveData = await globalMutate(activePromptsKey);

    const optimisticFilter = (d: Prompt[] = []) => d.filter(p => p.id !== promptId);
    globalMutate(allPromptsKey, optimisticFilter, false);
    globalMutate(activePromptsKey, optimisticFilter, false);

    try {
      await apiClient.del(`/prompts/${promptId}`);
    } catch(e) {
      globalMutate(allPromptsKey, originalAllData, false);
      globalMutate(activePromptsKey, originalActiveData, false);
      throw e;
    }
  };

  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    const allPromptsKey = '/prompts?include_archived=true';
    const activePromptsKey = '/prompts';

    const originalAllData = await globalMutate(allPromptsKey) as Prompt[] | undefined;
    const originalActiveData = await globalMutate(activePromptsKey) as Prompt[] | undefined;

    const optimisticAllData = (originalAllData || []).map(p =>
      p.id === promptId ? { ...p, is_archived: isArchived } : p
    );
    const optimisticActiveData = optimisticAllData.filter(p => !p.is_archived);

    globalMutate(allPromptsKey, optimisticAllData, false);
    globalMutate(activePromptsKey, optimisticActiveData, false);
    
    try {
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });
      globalMutate('/metrics/activity/recent');
    } catch (e) {
      globalMutate(allPromptsKey, originalAllData, false);
      globalMutate(activePromptsKey, originalActiveData, false);
      throw e;
    }
  };
  
  const ratePrompt = async (promptId: string, versionNumber: number, rating: number) => {
    const updater = (currentData: Prompt[] = []) => {
        const promptToRate = currentData.find(p => p.id === promptId);
        if (!promptToRate) return currentData;
        
        const oldAvgRating = promptToRate.average_rating || 0;
        const oldRatingCount = promptToRate.rating_count || 0;
        const newRatingCount = oldRatingCount + 1;
        const newAvgRating = ((oldAvgRating * oldRatingCount) + rating) / newRatingCount;

        return currentData.map(p =>
            p.id === promptId
            ? { ...p, average_rating: newAvgRating, rating_count: newRatingCount }
            : p
        );
    };

    await globalMutate('/prompts?include_archived=true', updater, { revalidate: false });
    await globalMutate('/prompts', updater, { revalidate: false });

    try {
        await apiClient.post('/metrics/rate', {
            prompt_id: promptId,
            version_number: versionNumber,
            rating: rating,
        });
    } catch (e) {
        globalMutate('/prompts?include_archived=true');
        globalMutate('/prompts');
        throw e;
    }
  };

  return {
    prompts: data,
    isLoading,
    isError: error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    archivePrompt,
    ratePrompt,
  };
}

export function usePromptDetail(promptId: string | undefined | null) {
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
import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt, PromptVersion } from '@/types/prompt';

interface CreatePromptData {
  name: string;
  description: string;
  text: string;
}

const listFetcher = (url: string) => apiClient.get<Prompt[]>(url);
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
    // Optimistically update for instant UI feedback
    const optimisticData = (data || []).filter(p => p.id !== promptId);
    mutate(endpoint, optimisticData, false);

    try {
      await apiClient.del(`/prompts/${promptId}`);
      revalidateAllLists();
    } catch (e) {
      mutate(endpoint, data, false); // Rollback on error
      throw e;
    }
  };

  const archivePrompt = async (promptId: string, isArchived: boolean) => {
    const currentData = data || [];
    
    // --- FIX: Implement Optimistic Update ---
    // 1. Instantly create the expected new state of the list
    const optimisticData = currentData.map(p =>
      p.id === promptId ? { ...p, is_archived: isArchived } : p
    );
    // 2. Update the local SWR cache immediately without waiting for the API
    mutate(endpoint, optimisticData, false);

    try {
      // 3. Send the actual API request
      await apiClient.patch<Prompt>(`/prompts/${promptId}`, { is_archived: isArchived });
      // 4. Trigger a revalidation to get the final state from the server
      revalidateAllLists();
    } catch (e) {
      // 5. If the API call fails, roll back the UI to its original state
      mutate(endpoint, currentData, false);
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
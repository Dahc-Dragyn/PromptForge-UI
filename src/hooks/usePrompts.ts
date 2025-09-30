import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Prompt } from '@/types/prompt';

// --- Type Definitions for Clarity ---
interface PromptListData {
  prompts: Prompt[];
}

// Frontend components will use this simple shape
interface CreatePromptData {
  name: string;
  description: string;
  text: string;
}

// The hook will map to this shape for the backend
interface CreatePromptPayload {
  name: string;
  task_description: string;
  initial_prompt_text: string;
}

// --- Fetchers ---
const listFetcher = (url: string) => apiClient.get<PromptListData>(url);
const singleFetcher = (url: string) => apiClient.get<Prompt>(url);

// =================================================================================
// --- HOOK DEFINITIONS ---
// =================================================================================

/**
 * Hook for fetching and managing the list of all prompts.
 */
export function usePrompts() {
  const endpoint = '/prompts/';
  const { data, error, isLoading } = useSWR<PromptListData>(endpoint, listFetcher);

  /**
   * Creates a new prompt.
   * Maps the simple frontend data structure to the required backend payload.
   */
  const createPrompt = async (promptData: CreatePromptData) => {
    // --- THIS IS THE FIX ---
    // It correctly maps the frontend-friendly names to the backend-required names.
    const payload: CreatePromptPayload = {
      name: promptData.name,
      task_description: promptData.description,
      initial_prompt_text: promptData.text,
    };
    
    const newPrompt = await apiClient.post<Prompt>(endpoint, payload);
    
    // Revalidate the SWR cache for the prompt list to update the UI
    mutate(endpoint);
    
    return newPrompt;
  };

  /**
   * Updates an existing prompt.
   */
  const updatePrompt = async (promptId: string, updateData: Partial<Prompt>) => {
    const updatedPrompt = await apiClient.patch<Prompt>(`/prompts/${promptId}`, updateData);
    
    // Revalidate both the list and the specific prompt detail view
    mutate(endpoint);
    mutate(`/prompts/${promptId}`);
    
    return updatedPrompt;
  };

  /**
   * Deletes a prompt.
   */
  const deletePrompt = async (promptId: string) => {
    await apiClient.del(`/prompts/${promptId}`);
    mutate(endpoint); // Revalidate the list
  };

  return {
    prompts: data?.prompts,
    isLoading,
    isError: error,
    createPrompt,
    updatePrompt,
    deletePrompt,
  };
}

/**
 * Hook for fetching the details of a single prompt.
 */
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
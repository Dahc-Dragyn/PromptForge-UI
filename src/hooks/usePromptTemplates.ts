// src/hooks/usePromptTemplates.ts
import useSWR, { useSWRConfig } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptTemplate } from '@/types/template';

// --- Data Fetching Hook ---

const fetcher = (url: string) => apiClient.get<PromptTemplate[]>(url);

export function usePromptTemplates() {
  const { data, error, isLoading } = useSWR<PromptTemplate[]>('/templates/', fetcher);

  return {
    templates: data,
    isLoading,
    isError: error,
  };
}

// --- Data Mutation Functions ---

export function useTemplateMutations() {
  const { mutate } = useSWRConfig();
  const endpoint = '/templates/';

  const createTemplate = async (
    templateData: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PromptTemplate> => {
    const newTemplate = await apiClient.post<PromptTemplate>(endpoint, templateData);
    mutate(endpoint); // Revalidate the list of templates
    return newTemplate;
  };

  const updateTemplate = async (
    templateId: string,
    updateData: Partial<PromptTemplate>
  ): Promise<PromptTemplate> => {
    const updatedTemplate = await apiClient.patch<PromptTemplate>(`${endpoint}${templateId}`, updateData);
    mutate(endpoint);
    return updatedTemplate;
  };
  
  const deleteTemplate = async (templateId: string): Promise<void> => {
    await apiClient.del(`${endpoint}${templateId}`);
    mutate(endpoint);
  };

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
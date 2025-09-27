// src/hooks/usePromptTemplates.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptTemplate } from '@/types/template';

const fetcher = (url: string) => apiClient.get<PromptTemplate[]>(url);

export function usePromptTemplates() {
  const endpoint = '/templates'; // The proxy will handle the trailing slash
  const { data, error, isLoading, mutate } = useSWR<PromptTemplate[]>(endpoint, fetcher);

  const createTemplate = async (
    templateData: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PromptTemplate> => {
    const newTemplate = await apiClient.post<PromptTemplate>(endpoint, templateData);
    mutate(); // Revalidate the list of templates
    return newTemplate;
  };

  const updateTemplate = async (
    templateId: string,
    updateData: Partial<PromptTemplate>
  ): Promise<PromptTemplate> => {
    const updatedTemplate = await apiClient.patch<PromptTemplate>(`${endpoint}/${templateId}`, updateData);
    mutate();
    return updatedTemplate;
  };
  
  const deleteTemplate = async (templateId: string): Promise<void> => {
    await apiClient.del(`${endpoint}/${templateId}`);
    mutate();
  };

  return {
    templates: data,
    isLoading,
    isError: error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
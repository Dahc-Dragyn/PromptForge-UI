// src/hooks/usePromptTemplates.ts
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptTemplate } from '@/types/template';
import { mutate } from 'swr';

const fetcher = (url: string) => apiClient.get<PromptTemplate[]>(url);
const singleFetcher = (url: string) => apiClient.get<PromptTemplate>(url);

export function usePromptTemplates() {
  const endpoint = '/templates';
  const { data, error, isLoading } = useSWR<PromptTemplate[]>(endpoint, fetcher);

  const createTemplate = async (
    templateData: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PromptTemplate> => {
    const newTemplate = await apiClient.post<PromptTemplate>(endpoint, templateData);
    mutate(endpoint); // Revalidate the list of templates
    return newTemplate;
  };

  const updateTemplate = async (
    templateId: string,
    updateData: Partial<Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<PromptTemplate> => {
    const updatedTemplate = await apiClient.patch<PromptTemplate>(`${endpoint}/${templateId}`, updateData);
    mutate(endpoint); // Revalidate the list
    mutate(`${endpoint}/${templateId}`); // Revalidate the specific template
    return updatedTemplate;
  };
  
  const deleteTemplate = async (templateId: string): Promise<void> => {
    await apiClient.del(`${endpoint}/${templateId}`);
    mutate(endpoint);
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

export function useTemplateDetail(templateId: string | null) {
    const { data, error, isLoading } = useSWR(
        templateId ? `/templates/${templateId}` : null,
        singleFetcher
    );

    return {
        template: data,
        isLoading,
        isError: error
    };
}
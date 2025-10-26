// src/hooks/usePromptTemplates.ts
import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { PromptTemplate } from '@/types/template';
import { apiClient } from '@/lib/apiClient';

type CreateTemplateData = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'is_archived' | 'user_id' | 'version'>;
type UpdateTemplateData = Partial<CreateTemplateData>;

export function usePromptTemplates(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  // This is correct: list endpoints require a slash
  const endpoint = includeArchived ? '/templates/?include_archived=true' : '/templates/';
  const key = userId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR<PromptTemplate[]>(key);

  const revalidateAllLists = () => {
    if (!userId) return;
    globalMutate([`/templates/`, userId]);
    globalMutate([`/templates/?include_archived=true`, userId]);
  };

  const createTemplate = async (templateData: CreateTemplateData) => {
    // This is correct: POST /templates/ needs a slash
    const newTemplate = await apiClient.post<PromptTemplate>('/templates/', templateData);
    revalidateAllLists();
    return newTemplate;
  };

  const updateTemplate = async (templateId: string, templateData: UpdateTemplateData) => {
    if (!userId) throw new Error('User not authenticated');
    
    // This is correct: PATCH /templates/{id}/ needs a slash
    const updatedTemplate = await apiClient.patch<PromptTemplate>(
      `/templates/${templateId}/`,
      templateData
    );
    
    // --- THIS IS THE FIX ---
    // The detail page SWR key does NOT have a slash.
    // We must mutate the key that useTemplateDetail is actually using.
    globalMutate([`/templates/${templateId}`, userId], updatedTemplate, { revalidate: false });
    // -------------------------
    
    revalidateAllLists();
    return updatedTemplate;
  };

  const deleteTemplate = async (templateId: string) => {
    // This is correct: DELETE /templates/{id}/ needs a slash
    await apiClient.delete(`/templates/${templateId}/`);
    revalidateAllLists();
  };

  const archiveTemplate = async (templateId: string, is_archived: boolean) => {
    if (!userId) throw new Error('User not authenticated');
    
    // This is correct: PATCH /templates/{id}/ needs a slash
    await apiClient.patch(`/templates/${templateId}/`, { is_archived });
    
    // --- THIS IS THE FIX ---
    // The detail page SWR key does NOT have a slash.
    globalMutate([`/templates/${templateId}`, userId]);
    // -------------------------
    
    revalidateAllLists();
  };

  const copyTemplate = async (templateId: string) => {
    if (!userId) throw new Error('User not authenticated');
    
    // This is correct: POST /templates/{id}/copy/ needs a slash
    const newTemplate = await apiClient.post<PromptTemplate>(
      `/templates/${templateId}/copy/`,
      {}
    );
    revalidateAllLists();
    return newTemplate;
  };

  const templates = data ? data.map((t) => ({ ...t, is_archived: t.is_archived ?? false })) : undefined;

  return {
    templates,
    isLoading: !error && !templates && !!userId,
    isError: error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate,
    copyTemplate,
    mutate,
  };
}

// --- THIS IS THE MAIN FIX FOR THE "VIEW" BUTTON ---
// The backend GET route does not have a trailing slash.
export function useTemplateDetail(templateId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = `/templates/${templateId}`; // <-- TRAILING SLASH REMOVED
  const key = templateId && userId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR<PromptTemplate>(key);

  return {
    template: data,
    isLoading: !error && !data && !!key,
    isError: error,
    mutate,
  };
}
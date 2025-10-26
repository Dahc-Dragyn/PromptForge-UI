import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { PromptTemplate } from '@/types/template';
import { apiClient } from '@/lib/apiClient';

type CreateTemplateData = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'is_archived' | 'user_id' | 'version'>;
type UpdateTemplateData = Partial<CreateTemplateData>;

export function usePromptTemplates(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  // List endpoints still need the trailing slash
  const endpoint = includeArchived ? '/templates/?include_archived=true' : '/templates/';
  const key = userId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR<PromptTemplate[]>(key);

  const revalidateAllLists = () => {
    if (!userId) return;
    // List keys still need the trailing slash
    globalMutate([`/templates/`, userId]);
    globalMutate([`/templates/?include_archived=true`, userId]);
  };

  const createTemplate = async (templateData: CreateTemplateData) => {
    // POST needs trailing slash
    const newTemplate = await apiClient.post<PromptTemplate>('/templates/', templateData);
    revalidateAllLists();
    return newTemplate.data; // Return .data
  };

  const updateTemplate = async (templateId: string, templateData: UpdateTemplateData) => {
    if (!userId) throw new Error('User not authenticated');

    // PATCH needs trailing slash
    const updatedTemplateResponse = await apiClient.patch<PromptTemplate>(
      `/templates/${templateId}/`,
      templateData
    );

    // --- FINAL FIX: Remove trailing slash from detail key for cache mutation ---
    globalMutate([`/templates/${templateId}`, userId], updatedTemplateResponse.data, { revalidate: false });

    revalidateAllLists();
    return updatedTemplateResponse.data; // Return .data
  };

  const deleteTemplate = async (templateId: string) => {
    // DELETE needs trailing slash
    await apiClient.delete(`/templates/${templateId}/`);
    revalidateAllLists();
  };

  const archiveTemplate = async (templateId: string, is_archived: boolean) => {
    if (!userId) throw new Error('User not authenticated');

    // PATCH needs trailing slash
    const response = await apiClient.patch(`/templates/${templateId}/`, { is_archived });

    // --- FINAL FIX: Remove trailing slash from detail key for cache mutation ---
    globalMutate([`/templates/${templateId}`, userId], response.data, { revalidate: false });

    revalidateAllLists();
  };

  const copyTemplate = async (templateId: string) => {
    if (!userId) throw new Error('User not authenticated');

    // POST copy needs trailing slash
    const newTemplate = await apiClient.post<PromptTemplate>(
      `/templates/${templateId}/copy/`,
      {}
    );
    revalidateAllLists();
    return newTemplate.data; // Return .data
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

// ----------------------------------------------------------------------

export function useTemplateDetail(templateId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  // --- FINAL FIX: Remove trailing slash to match the working backend route ---
  const endpoint = `/templates/${templateId}`;
  const key = templateId && userId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR<PromptTemplate>(key);

  return {
    template: data,
    isLoading: !error && !data && !!key,
    isError: error,
    mutate,
  };
}
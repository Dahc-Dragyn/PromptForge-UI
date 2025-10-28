import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { PromptTemplate } from '@/types/template';
import { apiClient } from '@/lib/apiClient';
import { AxiosResponse } from 'axios'; // Import AxiosResponse

// Ensure CreateTemplateData matches what the form provides
type CreateTemplateData = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'is_archived' | 'user_id' | 'version' | 'owner' | 'average_rating' | 'rating_count'>;
type UpdateTemplateData = Partial<CreateTemplateData>;

// --- Fetcher for lists ---
const listFetcher = async (key: [string, string]): Promise<PromptTemplate[]> => {
  const [url] = key;
  const response = await apiClient.get<PromptTemplate[]>(url);
  const templates = (response && 'data' in response) ? (response as AxiosResponse<PromptTemplate[]>).data : (response as PromptTemplate[]);
  return Array.isArray(templates) ? templates : [];
};

// --- Fetcher for single template ---
const singleFetcher = async (key: [string, string]): Promise<PromptTemplate | null> => {
  const [url] = key;
  try {
    const response = await apiClient.get<PromptTemplate>(url);
    const template = (response && 'data' in response) ? (response as AxiosResponse<PromptTemplate>).data : (response as PromptTemplate);
    return template;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export function usePromptTemplates(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  // List endpoints need the trailing slash
  const endpoint = includeArchived ? '/templates/?include_archived=true' : '/templates/';
  const key = userId ? [endpoint, userId] : null;

  // Use the listFetcher
  const { data, error, mutate } = useSWR<PromptTemplate[]>(key, listFetcher);

  const revalidateAllLists = () => {
    if (!userId) return;
    // List keys need the trailing slash
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

    // --- FIX: PATCH for a specific resource has NO trailing slash ---
    const updatedTemplateResponse = await apiClient.patch<PromptTemplate>(
      `/templates/${templateId}`, // Removed trailing slash
      templateData
    );

    // Update the detail cache key (which also has NO slash)
    globalMutate([`/templates/${templateId}`, userId], updatedTemplateResponse.data, { revalidate: false });

    revalidateAllLists();
    return updatedTemplateResponse.data; // Return .data
  };

  const deleteTemplate = async (templateId: string) => {
    // --- FIX: DELETE for a specific resource has NO trailing slash ---
    await apiClient.delete(`/templates/${templateId}`); // Removed trailing slash
    revalidateAllLists();
  };

  const archiveTemplate = async (templateId: string, is_archived: boolean) => {
    if (!userId) throw new Error('User not authenticated');

    // --- FIX: PATCH for a specific resource has NO trailing slash ---
    const response = await apiClient.patch(`/templates/${templateId}`, { is_archived }); // Removed trailing slash

    // Update the detail cache key (which also has NO slash)
    globalMutate([`/templates/${templateId}`, userId], response.data, { revalidate: false });

    revalidateAllLists();
  };

  const copyTemplate = async (templateId: string) => {
    if (!userId) throw new Error('User not authenticated');

    // This is a custom action, it likely needs a trailing slash
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

  // Detail endpoint has NO trailing slash
  const endpoint = `/templates/${templateId}`;
  const key = templateId && userId ? [endpoint, userId] : null;

  // --- FIX: Allow SWR to handle a 'null' response type ---
  const { data, error, mutate } = useSWR<PromptTemplate | null>(key, singleFetcher);

  return {
    template: data,
    isLoading: !error && !data && !!key,
    isError: error,
    mutate,
  };
}
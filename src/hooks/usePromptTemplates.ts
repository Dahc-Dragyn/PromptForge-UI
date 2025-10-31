import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { PromptTemplate } from '@/types/template';
import { apiClient } from '@/lib/apiClient';
// We don't need AxiosResponse because our interceptor handles .data
// import { AxiosResponse } from 'axios';

// Ensure CreateTemplateData matches what the form provides
type CreateTemplateData = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'is_archived' | 'user_id' | 'version' | 'owner' | 'average_rating' | 'rating_count'>;
type UpdateTemplateData = Partial<CreateTemplateData>;

// --- Fetcher for lists ---
const listFetcher = async (key: [string, string]): Promise<PromptTemplate[]> => {
  const [url] = key;
  // Our apiClient interceptor already returns response.data
  const templates = await apiClient.get<PromptTemplate[]>(url);
  return Array.isArray(templates) ? templates : [];
};

// --- Fetcher for single template ---
const singleFetcher = async (key: [string, string]): Promise<PromptTemplate | null> => {
  const [url] = key;
  try {
    // Our apiClient interceptor already returns response.data
    const template = await apiClient.get<PromptTemplate>(url);
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

  // --- THIS FIX IS KEPT ---
  // The 308 Redirects are gone. This is correct.
  const endpoint = includeArchived ? '/templates?include_archived=true' : '/templates';
  const key = userId ? [endpoint, userId] : null;

  // Use the listFetcher
  const { data, error, mutate } = useSWR<PromptTemplate[]>(key, listFetcher);

  const revalidateAllLists = () => {
    if (!userId) return;
    // --- THIS FIX IS KEPT ---
    globalMutate([`/templates`, userId]);
    globalMutate([`/templates?include_archived=true`, userId]);
  };

  const createTemplate = async (templateData: CreateTemplateData) => {
    // POST for CREATE *does* need a trailing slash, per templates.py
    const newTemplate = await apiClient.post<PromptTemplate>('/templates/', templateData);
    revalidateAllLists();
    return newTemplate; // Interceptor returns data
  };

  const updateTemplate = async (templateId: string, templateData: UpdateTemplateData) => {
    if (!userId) throw new Error('User not authenticated');

    // PATCH for a specific resource has NO trailing slash
    const updatedTemplate = await apiClient.patch<PromptTemplate>(
      `/templates/${templateId}`,
      templateData
    );

    // Update the detail cache key (which also has NO slash)
    globalMutate([`/templates/${templateId}`, userId], updatedTemplate, { revalidate: false });

    revalidateAllLists();
    return updatedTemplate; // Interceptor returns data
  };

  const deleteTemplate = async (templateId: string) => {
    // DELETE for a specific resource has NO trailing slash
    await apiClient.delete(`/templates/${templateId}`);
    revalidateAllLists();
  };

  // --- FINAL, PRODUCTION-GRADE FIX ---
  const archiveTemplate = async (templateId: string, is_archived: boolean) => {
    if (!userId || !key) throw new Error('User not authenticated');

    const currentData = data || [];

    // --- THIS IS THE FIX ---
    // Using the same .map().filter() logic from the (working) usePrompts.ts
    // My "simple" filter was broken.
    const finalData = currentData
        .map(t => (t.id === templateId ? { ...t, is_archived: is_archived } : t))
        .filter(t => {
            return includeArchived || t.id !== templateId || (t.id === templateId && !is_archived);
         });
    // --- END FIX ---

    try {
      // 1. Await the API call. (PATCH has NO trailing slash)
      await apiClient.patch(`/templates/${templateId}`, { is_archived });

      // 2. "Manual Flash": Update the *current* list's cache.
      //    `revalidate: false` PREVENTS the race condition.
      mutate(finalData, { revalidate: false });

      // 3. "Lazy Sync": Find the *other* list (NO trailing slash).
      const otherListKey = includeArchived 
            ? [`/templates`, userId] // The non-archived list
            : [`/templates?include_archived=true`, userId]; // The archived list
      
      //    Delay the background refresh to let Firestore settle.
      setTimeout(() => {
        globalMutate(otherListKey);
      }, 300);

    } catch (e) {
      // If the API call fails, we rollback by mutating with the original data.
      // (This is safer than your original code which just threw)
      mutate(currentData, { revalidate: false });
      console.error("Failed to archive template:", e);
      throw e;
    }
  };
  // --- END FIX ---

  const copyTemplate = async (templateId: string) => {
    if (!userId) throw new Error('User not authenticated');

    // This is a custom action, it likely needs a trailing slash
    // We'll leave this one alone for now as it's not the bug.
    const newTemplate = await apiClient.post<PromptTemplate>(
      `/templates/${templateId}/copy/`,
      {}
    );
    revalidateAllLists();
    return newTemplate; // Interceptor returns data
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

  // Detail endpoint has NO trailing slash (This is correct)
  const endpoint = `/templates/${templateId}`;
  const key = templateId && userId ? [endpoint, userId] : null;

  const { data, error, mutate } = useSWR<PromptTemplate | null>(key, singleFetcher);

  return {
    template: data,
    isLoading: !error && !data && !!key,
    isError: error,
    mutate,
  };
}
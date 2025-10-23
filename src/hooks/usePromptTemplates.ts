// src/hooks/usePromptTemplates.ts
import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { PromptTemplate } from '@/types/template';
import { apiClient } from '@/lib/apiClient';

type CreateTemplateData = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'is_archived' | 'user_id' | 'version'>;
type UpdateTemplateData = Partial<CreateTemplateData>;

// FIX: Fetcher now accepts the array key and extracts the URL
const listFetcher = async (key: [string, string]): Promise<PromptTemplate[]> => {
  const [url] = key; // Extract the URL from the key array
  const templates = (await apiClient.get(url)) as PromptTemplate[];
  return (templates || []).map((t) => ({ ...t, is_archived: t.is_archived ?? false }));
};

export function usePromptTemplates(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = includeArchived ? '/templates/?include_archived=true' : '/templates/';
  const key = userId ? [endpoint, userId] : null; // Key remains an array

  // SWR call is unchanged, but listFetcher now handles the array key correctly
  const { data: templates, error, mutate } = useSWR<PromptTemplate[]>(key, listFetcher); // Pass listFetcher

  const revalidateAllLists = () => {
    if (!userId) return;
    globalMutate([`/templates/`, userId]);
    globalMutate([`/templates/?include_archived=true`, userId]);
  };

  // --- All mutation functions below are correct ---
  const createTemplate = async (templateData: CreateTemplateData) => { /* ... */ };
  const updateTemplate = async (templateId: string, templateData: UpdateTemplateData) => { /* ... */ };
  const deleteTemplate = async (templateId: string) => { /* ... */ };
  const archiveTemplate = async (templateId: string, is_archived: boolean) => { /* ... */ };
  const copyTemplate = async (templateId: string) => { /* ... */ };

  return {
    templates,
    isLoading: !error && !templates && !!userId,
    isError: error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate,
    copyTemplate,
  };
}

// FIX: The detail hook correctly uses the global fetcher
export function useTemplateDetail(templateId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = `/templates/${templateId}/`;
  const key = templateId && userId ? [endpoint, userId] : null; // Key is correct array

  const { data, error } = useSWR<PromptTemplate>(key); // No fetcher needed

  return {
    template: data,
    isLoading: !error && !data && !!key,
    isError: error,
  };
}
import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { PromptTemplate } from '@/types/template'; // <-- FIX: Changed Template to PromptTemplate
import { useAuth } from '@/context/AuthContext';

// Helper types for creating/updating
type CreateTemplateData = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'is_archived' | 'user_id' | 'version'>;
type UpdateTemplateData = Partial<CreateTemplateData>;

const listFetcher = async (url: string): Promise<PromptTemplate[]> => {
    const { data } = await apiClient.get<PromptTemplate[]>(url);
    // Ensure is_archived is always a boolean for consistent filtering
    return data.map(t => ({ ...t, is_archived: t.is_archived ?? false }));
};

const singleFetcher = async (url: string): Promise<PromptTemplate> => {
    const { data } = await apiClient.get<PromptTemplate>(url);
    return data;
};

export function usePromptTemplates(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  const endpoint = includeArchived ? '/templates?include_archived=true' : '/templates';
  const key = userId ? [endpoint, userId] : null;

  const { data, error, isLoading } = useSWR<PromptTemplate[]>(key, () => listFetcher(endpoint));

  const revalidateLists = () => {
    if (!userId) return;
    globalMutate([`/templates`, userId]);
    globalMutate([`/templates?include_archived=true`, userId]);
  };

  const createTemplate = async (templateData: CreateTemplateData): Promise<PromptTemplate> => {
    if (!userId) throw new Error("User must be logged in to create a template.");
    const { data: newTemplate } = await apiClient.post<PromptTemplate>('/templates', templateData);
    revalidateLists();
    return newTemplate;
  };
  
  const updateTemplate = async (templateId: string, updateData: UpdateTemplateData): Promise<void> => {
    if (!userId) return;
    const apiCall = apiClient.patch<PromptTemplate>(`/templates/${templateId}`, updateData);
    const updater = (currentData: PromptTemplate[] = []) => 
      currentData.map(t => t.id === templateId ? { ...t, ...updateData } : t);

    await globalMutate([`/templates`, userId], updater, { revalidate: false });
    await globalMutate([`/templates?include_archived=true`, userId], updater, { revalidate: false });
    await globalMutate([`/templates/${templateId}`, userId], (current?: PromptTemplate) => ({ ...current!, ...updateData }), { revalidate: false });

    try {
        await apiCall;
        revalidateLists();
    } catch(e) {
        revalidateLists();
        throw e;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    if (!userId) return;
    const allKey: [string, string] = ['/templates?include_archived=true', userId];
    const activeKey: [string, string] = ['/templates', userId];

    const originalAll = await globalMutate(allKey);
    const originalActive = await globalMutate(activeKey);
    
    const optimisticFilter = (d: PromptTemplate[] = []) => d.filter(t => t.id !== templateId);
    
    globalMutate(allKey, optimisticFilter, false);
    globalMutate(activeKey, optimisticFilter, false);

    try {
      await apiClient.delete(`/templates/${templateId}`);
    } catch(e) {
      globalMutate(allKey, originalAll, false);
      globalMutate(activeKey, originalActive, false);
      throw e;
    }
  };

  const archiveTemplate = async (templateId: string, isArchived: boolean): Promise<void> => {
    if (!userId) return;
    const allKey: [string, string] = ['/templates?include_archived=true', userId];
    const activeKey: [string, string] = ['/templates', userId];

    const originalAll = await globalMutate(allKey) as PromptTemplate[] | undefined;
    
    const optimisticAllData = (originalAll || []).map(t =>
        t.id === templateId ? { ...t, is_archived: isArchived } : t
    );
    const optimisticActiveData = optimisticAllData.filter(t => !t.is_archived);

    globalMutate(allKey, optimisticAllData, false);
    globalMutate(activeKey, optimisticActiveData, false);
    
    try {
        await apiClient.patch(`/templates/${templateId}`, { is_archived: isArchived });
    } catch (e) {
        const originalActive = (originalAll || []).filter(t => !t.is_archived);
        globalMutate(allKey, originalAll, false);
        globalMutate(activeKey, originalActive, false);
        throw e;
    }
  };

  const copyTemplate = async (templateId: string): Promise<PromptTemplate> => {
    if (!userId) throw new Error("User must be logged in to copy a template.");
    const templateToCopy = data?.find(t => t.id === templateId);
    if (!templateToCopy) {
      throw new Error('Template not found to copy.');
    }
    const newTemplateData: CreateTemplateData = {
      name: `${templateToCopy.name} (Copy)`,
      description: templateToCopy.description,
      content: templateToCopy.content,
      tags: templateToCopy.tags,
    };
    return createTemplate(newTemplateData);
  };

  return {
    templates: data,
    isLoading: !error && !data && !!userId,
    isError: error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate,
    copyTemplate,
  };
}

export function useTemplateDetail(templateId: string | null) {
    const { user } = useAuth();
    const userId = user?.uid;
    
    const key = templateId && userId ? [`/templates/${templateId}`, userId] : null;
    
    const { data, error, isLoading } = useSWR(
        key,
        () => singleFetcher(`/templates/${templateId}`)
    );

    return {
        template: data,
        isLoading,
        isError: error
    };
}
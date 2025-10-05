// src/hooks/usePromptTemplates.ts
import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { Template } from '@/types/template';

// Helper types for creating/updating
type CreateTemplateData = Omit<Template, 'id' | 'created_at' | 'updated_at' | 'is_archived'>;
type UpdateTemplateData = Partial<CreateTemplateData>;

const listFetcher = async (url: string): Promise<Template[]> => {
    const response = await apiClient.get<Template[]>(url);
    // Ensure is_archived is always a boolean for consistent filtering
    return response.map(t => ({ ...t, is_archived: t.is_archived ?? false }));
};

const singleFetcher = (url: string) => apiClient.get<Template>(url);

export function usePromptTemplates(includeArchived = false) {
  const endpoint = includeArchived ? '/templates?include_archived=true' : '/templates';
  const { data, error, isLoading } = useSWR<Template[]>(endpoint, listFetcher);

  const revalidateLists = () => {
    globalMutate('/templates');
    globalMutate('/templates?include_archived=true');
  };

  const createTemplate = async (templateData: CreateTemplateData): Promise<Template> => {
    // For creation, a simple revalidation is often best.
    const newTemplate = await apiClient.post<Template>('/templates', templateData);
    revalidateLists();
    return newTemplate;
  };
  
  const updateTemplate = async (templateId: string, updateData: UpdateTemplateData): Promise<void> => {
    const apiCall = apiClient.patch<Template>(`/templates/${templateId}`, updateData);
    const updater = (currentData: Template[] = []) => 
      currentData.map(t => t.id === templateId ? { ...t, ...updateData } : t);

    // Optimistically update all relevant caches
    await globalMutate('/templates', updater, { revalidate: false });
    await globalMutate('/templates?include_archived=true', updater, { revalidate: false });
    await globalMutate(`/templates/${templateId}`, (current: Template) => ({ ...current, ...updateData }), { revalidate: false });

    try {
        await apiCall;
        revalidateLists(); // Revalidate for consistency after success
    } catch(e) {
        revalidateLists(); // Rollback on error by re-fetching
        throw e;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    const allKey = '/templates?include_archived=true';
    const activeKey = '/templates';

    const originalAll = await globalMutate(allKey);
    const originalActive = await globalMutate(activeKey);
    
    const optimisticFilter = (d: Template[] = []) => d.filter(t => t.id !== templateId);
    
    globalMutate(allKey, optimisticFilter, false);
    globalMutate(activeKey, optimisticFilter, false);

    try {
      await apiClient.del(`/templates/${templateId}`);
    } catch(e) {
      globalMutate(allKey, originalAll, false);
      globalMutate(activeKey, originalActive, false);
      throw e;
    }
  };

  const archiveTemplate = async (templateId: string, isArchived: boolean): Promise<void> => {
    const allKey = '/templates?include_archived=true';
    const activeKey = '/templates';

    const originalAll = await globalMutate(allKey) as Template[] | undefined;
    
    const optimisticAllData = (originalAll || []).map(t =>
        t.id === templateId ? { ...t, is_archived: isArchived } : t
    );
    const optimisticActiveData = optimisticAllData.filter(t => !t.is_archived);

    globalMutate(allKey, optimisticAllData, false);
    globalMutate(activeKey, optimisticActiveData, false);
    
    try {
        await apiClient.patch(`/templates/${templateId}`, { is_archived: isArchived });
    } catch (e) {
        // Rollback using original data
        const originalActive = (originalAll || []).filter(t => !t.is_archived);
        globalMutate(allKey, originalAll, false);
        globalMutate(activeKey, originalActive, false);
        throw e;
    }
  };

  const copyTemplate = async (templateId: string): Promise<Template> => {
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
    isLoading,
    isError: error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate,
    copyTemplate,
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
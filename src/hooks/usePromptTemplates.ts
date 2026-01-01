'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import {
  PromptTemplate,
  PromptTemplateCreate,
} from '@/types/template';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useCallback } from 'react';
import { getRecentActivityCacheKey } from './useRecentActivity';

/* -------------------------------------------------------------------------- */
/* TYPE DEFINITIONS (Fixed Types to include Slashes) */
/* -------------------------------------------------------------------------- */

// FIX: Added trailing slashes to keys
type TemplateListKey = readonly [`/templates/?include_archived=false` | `/templates/?include_archived=true`, string];
type TemplateDetailKey = readonly [`/templates/${string}`, string];

/* -------------------------------------------------------------------------- */
/* FETCHERS */
/* -------------------------------------------------------------------------- */

const listFetcher = async (key: TemplateListKey): Promise<PromptTemplate[]> => {
  const [url] = key;
  const data = await apiClient.get<PromptTemplate[]>(url);
  return Array.isArray(data) ? data : [];
};

const singleTemplateFetcher = async (key: TemplateDetailKey): Promise<PromptTemplate | null> => {
  const [url] = key;
  try {
    return await apiClient.get<PromptTemplate>(url);
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/* REVALIDATORS (Fixed Keys) */
/* -------------------------------------------------------------------------- */

// "Nuclear" revalidator for Create/Delete
const revalidateEverythingTemplates = (userId: string) => {
  // FIX: Added slashes to matches types
  globalMutate([`/templates/?include_archived=false`, userId]);
  globalMutate([`/templates/?include_archived=true`, userId]);

  const activityKey = getRecentActivityCacheKey(10, userId);
  if (activityKey) {
    globalMutate(activityKey);
  }
};

// "Surgical" revalidator for Archive
const revalidateForTemplateArchive = (userId: string, includeArchived: boolean) => {
  // FIX: Added slashes
  const otherListKey: TemplateListKey = includeArchived
    ? [`/templates/?include_archived=false`, userId]
    : [`/templates/?include_archived=true`, userId];
  globalMutate(otherListKey);

  const activityKey = getRecentActivityCacheKey(10, userId);
  if (activityKey) {
    globalMutate(activityKey);
  }
};

/* -------------------------------------------------------------------------- */
/* usePromptTemplates HOOK */
/* -------------------------------------------------------------------------- */
export function usePromptTemplates(includeArchived: boolean = false) {
  const { user } = useAuth();
  const userId = user?.uid;

  // FIX: Added trailing slash to the endpoint logic
  const endpoint = includeArchived ? `/templates/?include_archived=true` : `/templates/?include_archived=false`;
  const key: TemplateListKey | null = userId ? [endpoint, userId] : null;
  
  const { data, error, isLoading, mutate } = useSWR<PromptTemplate[]>(key, listFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    keepPreviousData: true,
  });

  /* CREATE */
  const createTemplate = useCallback(
    async (templateData: PromptTemplateCreate) => {
      if (!userId || !key) throw new Error('User/Key not available.');
      try {
        // FIX: Ensure slash is present for POST
        const newTemplate = await apiClient.post<PromptTemplate>('/templates/', templateData);
        
        await mutate(
          (currentData: PromptTemplate[] = []) => [newTemplate, ...currentData],
          { revalidate: false }
        );
        
        revalidateEverythingTemplates(userId);

        toast.success('Template saved instantly!');
        return newTemplate;
      } catch (err: any) {
        console.error('Failed to create template:', err);
        toast.error('Save failed');
        throw new Error('Failed to create template.');
      }
    }, [userId, key, mutate]);

  /* DELETE */
  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!userId || !key) return; 
      const currentData = data ?? [];
      const optimisticData = currentData.filter((t) => t.id !== templateId);
      try {
        await mutate(optimisticData, { revalidate: false }); 
        // ID endpoints usually don't need a slash
        await apiClient.delete(`/templates/${templateId}`);
        revalidateEverythingTemplates(userId);
        toast.success('Template deleted');
      } catch (err: any) {
        if ((err as any).response?.status === 404) {
          toast.success('Template already deleted.');
          revalidateEverythingTemplates(userId);
        } else {
          await mutate(currentData, { revalidate: false }); // Rollback
          console.error('Failed to delete template:', err);
          toast.error('Failed to delete template');
          throw new Error('Failed to delete template.');
        }
      }
    }, [userId, key, data, mutate]);

  /* ARCHIVE */
  const archiveTemplate = useCallback(
    async (templateId: string, isArchived: boolean) => {
      if (!userId || !key) return;
      
      const currentData = data ?? [];

      const optimisticData = currentData
        .map(t => (t.id === templateId ? { ...t, is_archived: isArchived } : t))
        .filter(t => includeArchived || !t.is_archived);

      try {
        await mutate(optimisticData, { revalidate: false }); 
        
        await apiClient.patch<PromptTemplate>(
          `/templates/${templateId}`,
          { is_archived: isArchived }
        );
        
        revalidateForTemplateArchive(userId, includeArchived);

        toast.success(isArchived ? 'Template archived' : 'Template unarchived');
      } catch (err: any) {
        console.error('Failed to archive template:', err);
        toast.error(`Failed to ${isArchived ? 'archive' : 'unarchive'} template`);
        await mutate(currentData, { revalidate: false });
        throw new Error(
          `Failed to ${isArchived ? 'archive' : 'unarchive'} template.`
        );
      }
    }, [userId, key, data, mutate, includeArchived]);
    
  /* COPY */
  const copyTemplate = useCallback(
    async (templateId: string) => {
      if (!userId || !key) return; 
      try {
        const templateToCopy = await apiClient.get<PromptTemplate>(
          `/templates/${templateId}`
        );

        if (!templateToCopy) {
          throw new Error('Template not found.');
        }

        const newTemplateData: PromptTemplateCreate = {
          name: `${templateToCopy.name} (Copy)`,
          description: templateToCopy.description,
          content: (templateToCopy as any).content, 
          tags: (templateToCopy as any).tags,
        };

        // FIX: Ensure slash is present for POST
        const newTemplate = await apiClient.post<PromptTemplate>(
          '/templates/',
          newTemplateData
        );
        
        await mutate(
          (currentData: PromptTemplate[] = []) => [newTemplate, ...currentData],
          { revalidate: false }
        );

        revalidateEverythingTemplates(userId);

        toast.success('Template copied!');
        return newTemplate;
      } catch (err: any) {
        console.error('Failed to copy template:', err);
        toast.error(err.message || 'Failed to copy template');
        throw new Error(err.message || 'Failed to copy template.');
      }
    }, [userId, key, mutate]);

  return {
    templates: data ?? [],
    isLoading: !error && !data && !!key, 
    isError: error,
    createTemplate,
    deleteTemplate,
    archiveTemplate,
    copyTemplate, 
  };
}

/* useTemplateDetail HOOK */
export function useTemplateDetail(templateId: string | null) {
  const { user } = useAuth();
  const userId = user?.uid; 

  const key: TemplateDetailKey | null = templateId && userId ? [`/templates/${templateId}`, userId] : null;

  const { data, error, isLoading, mutate } = useSWR<PromptTemplate | null>(key, singleTemplateFetcher);

  return {
    template: data,
    isLoading: !error && !data && !!key,
    isError: error,
    mutate,
  };
}
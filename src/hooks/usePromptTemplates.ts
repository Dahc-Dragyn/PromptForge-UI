// src/hooks/usePromptTemplates.ts
'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import {
    PromptTemplate,
    PromptTemplateCreate,
} from '@/types/template';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
// import { AxiosResponse } from 'axios'; // --- FIX 1: No longer needed ---
import { useCallback } from 'react'; // --- Added for hooks ---
import { getRecentActivityCacheKey } from './useRecentActivity';

/* -------------------------------------------------------------------------- */
/* TYPE DEFINITIONS                                                           */
/* -------------------------------------------------------------------------- */

// --- FIX 2: Use user-aware array key, just like in usePrompts.ts ---
type TemplateListKey = readonly [`/templates?include_archived=false` | `/templates?include_archived=true`, string];
type TemplateDetailKey = readonly [`/templates/${string}`, string];

/* -------------------------------------------------------------------------- */
/* FETCHERS (FIXED)                                                           */
/* -------------------------------------------------------------------------- */

// --- FIX 1: Removed getData helper. It's not needed. ---

// --- FIX 1 & 2: Use new key and trust apiClient to return data ---
const listFetcher = async (key: TemplateListKey): Promise<PromptTemplate[]> => {
    const [url] = key;
    const data = await apiClient.get<PromptTemplate[]>(url);
    return Array.isArray(data) ? data : [];
};

// --- FIX 1 & 2: Use new key and trust apiClient to return data ---
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
/* REVALIDATORS (Copied from usePrompts.ts)                                   */
/* -------------------------------------------------------------------------- */

// "Nuclear" revalidator for Create/Delete
const revalidateEverythingTemplates = (userId: string) => {
    globalMutate([`/templates?include_archived=false`, userId]);
    globalMutate([`/templates?include_archived=true`, userId]);

    const activityKey = getRecentActivityCacheKey(10, userId);
    if (activityKey) {
        globalMutate(activityKey);
    }
};

// "Surgical" revalidator for Archive (to prevent "blink")
const revalidateForTemplateArchive = (userId: string, includeArchived: boolean) => {
    const otherListKey: TemplateListKey = includeArchived
        ? [`/templates?include_archived=false`, userId]
        : [`/templates?include_archived=true`, userId];
    globalMutate(otherListKey);

    const activityKey = getRecentActivityCacheKey(10, userId);
    if (activityKey) {
        globalMutate(activityKey);
    }
};

/* -------------------------------------------------------------------------- */
/* usePromptTemplates HOOK                                                    */
/* -------------------------------------------------------------------------- */
export function usePromptTemplates(includeArchived: boolean = false) {
    const { user } = useAuth();
    const userId = user?.uid;

    // --- FIX 2: Use user-aware array key ---
    const endpoint = includeArchived ? `/templates?include_archived=true` : `/templates?include_archived=false`;
    const key: TemplateListKey | null = userId ? [endpoint, userId] : null;
    
    // --- FIX 2: Use correct fetcher ---
    const { data, error, isLoading, mutate } = useSWR<PromptTemplate[]>(key, listFetcher, {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        keepPreviousData: true,
    });

    /* ---------------------------------------------------------------------- */
    /* CREATE (FIXED: "Instant Create" + "Nuclear")                           */
    /* ---------------------------------------------------------------------- */
    const createTemplate = useCallback(
      async (templateData: PromptTemplateCreate) => {
        if (!userId || !key) throw new Error('User/Key not available.');
        try {
            // --- FIX 1: apiClient returns data directly ---
            const newTemplate = await apiClient.post<PromptTemplate>('/templates', templateData);
            
            // 1. Optimistic update for *this* list
            await mutate(
                (currentData: PromptTemplate[] = []) => [newTemplate, ...currentData],
                { revalidate: false }
            );
            
            // 2. "Nuclear" revalidate for *other* list + recent activity
            revalidateEverythingTemplates(userId);

            toast.success('Template saved instantly!');
            return newTemplate;
        } catch (err: any) {
            console.error('Failed to create template:', err);
            toast.error('Save failed');
            throw new Error('Failed to create template.');
        }
    }, [userId, key, mutate]);

    /* ---------------------------------------------------------------------- */
    /* DELETE (FIXED: Optimistic + "Nuclear")                                 */
    /* ---------------------------------------------------------------------- */
    const deleteTemplate = useCallback(
      async (templateId: string) => {
        if (!userId || !key) return; 
        const currentData = data ?? [];
        const optimisticData = currentData.filter((t) => t.id !== templateId);
        try {
            // 1. Optimistic update
            await mutate(optimisticData, { revalidate: false }); 
            // 2. API call
            await apiClient.delete(`/templates/${templateId}`);
            // 3. "Nuclear" revalidate
            revalidateEverythingTemplates(userId);
            toast.success('Template deleted');
        } catch (err: any) {
            if ((err as any).response?.status === 404) {
                toast.success('Template already deleted.');
                revalidateEverythingTemplates(userId); // Re-sync
            } else {
                await mutate(currentData, { revalidate: false }); // Rollback
                console.error('Failed to delete template:', err);
                toast.error('Failed to delete template');
                throw new Error('Failed to delete template.');
            }
        }
    }, [userId, key, data, mutate]);

    /* ---------------------------------------------------------------------- */
    /* ARCHIVE (FIXED: "Golden Logic" + "Surgical")                           */
    /* ---------------------------------------------------------------------- */
    const archiveTemplate = useCallback(
      async (templateId: string, isArchived: boolean) => {
        if (!userId || !key) return; // Wait for key
        
        const currentData = data ?? [];

        // 1. --- "Golden Logic" ---
        // Compute the final state of *this* list in memory
        const optimisticData = currentData
            .map(t => (t.id === templateId ? { ...t, is_archived: isArchived } : t))
            .filter(t => includeArchived || !t.is_archived); // This filter makes it disappear

        try {
            // 2. Optimistic UI Update for *this* list. DO NOT REVALIDATE.
            await mutate(optimisticData, { revalidate: false }); 
            
            // 3. Make the API call
            const updateData = { is_archived: isArchived };
            await apiClient.patch<PromptTemplate>(
                `/templates/${templateId}`,
                updateData
            );
            
            // 4. "Surgical" revalidate for *other* list + recent activity
            revalidateForTemplateArchive(userId, includeArchived);

            toast.success(isArchived ? 'Template archived' : 'Template unarchived');
        } catch (err: any) {
            console.error('Failed to archive template:', err);
            toast.error(`Failed to ${isArchived ? 'archive' : 'unarchive'} template`);
            // Rollback on failure
            await mutate(currentData, { revalidate: false });
            throw new Error(
                `Failed to ${isArchived ? 'archive' : 'unarchive'} template.`
            );
        }
    }, [userId, key, data, mutate, includeArchived]);
    
    /* ---------------------------------------------------------------------- */
    /* COPY (FIXED: Optimistic + "Nuclear")                                   */
    /* ---------------------------------------------------------------------- */
    const copyTemplate = useCallback(
      async (templateId: string) => {
        if (!userId || !key) return; 
        try {
            // --- FIX 1: apiClient returns data directly ---
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

            // --- FIX 1: apiClient returns data directly ---
            const newTemplate = await apiClient.post<PromptTemplate>(
                '/templates',
                newTemplateData
            );
            
            // 1. Optimistic update for *this* list
            await mutate(
                (currentData: PromptTemplate[] = []) => [newTemplate, ...currentData],
                { revalidate: false }
            );

            // 2. "Nuclear" revalidate for *other* list + recent activity
            revalidateEverythingTemplates(userId);

            toast.success('Template copied!');
            return newTemplate;
        } catch (err: any) {
            console.error('Failed to copy template:', err);
            toast.error(err.message || 'Failed to copy template');
            throw new Error(err.message || 'Failed to copy template.');
        }
    }, [userId, key, mutate]);

    /* ---------------------------------------------------------------------- */
    /* RETURN API                                 */
    /* ---------------------------------------------------------------------- */
    return {
        templates: data ?? [], // Return empty array for safety
        isLoading: !error && !data && !!key, 
        isError: error,
        createTemplate,
        deleteTemplate,
        archiveTemplate,
        copyTemplate, 
    };
}

/* -------------------------------------------------------------------------- */
/* useTemplateDetail HOOK (FIXED)                                             */
/* -------------------------------------------------------------------------- */
export function useTemplateDetail(templateId: string | null) {
    const { user } = useAuth();
    const userId = user?.uid; 

    // --- FIX 2: Use user-aware array key ---
    const key: TemplateDetailKey | null = templateId && userId ? [`/templates/${templateId}`, userId] : null;

    // --- FIX 1 & 2: Use correct fetcher ---
    const { data, error, isLoading, mutate } = useSWR<PromptTemplate | null>(key, singleTemplateFetcher);

    return {
        template: data,
        isLoading: !error && !data && !!key,
        isError: error,
        mutate,
    };
}
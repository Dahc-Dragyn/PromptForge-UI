// src/hooks/usePromptTemplates.ts (FIXED)
'use client';

import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import {
    PromptTemplate,
    PromptTemplateCreate,
} from '@/types/template';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

// ⚠️ ASSUMPTION: This key must be available for import.
// In a real application, you would ensure this constant is exported from './useRecentActivity'.
const RECENT_ACTIVITY_CACHE_KEY = '/metrics/activity/recent?limit=10';


/* -------------------------------------------------------------------------- */
/*                                 FETCHERS                                   */
/* -------------------------------------------------------------------------- */
const fetcher = (url: string) => apiClient.get<PromptTemplate[]>(url);

const singleTemplateFetcher = async (key: [string, string]): Promise<PromptTemplate | null> => {
    const [url] = key;
    try {
        // NOTE: Assuming apiClient is configured to return .data directly or we handle it gracefully
        const resp = await apiClient.get<PromptTemplate>(url);
        // Safely extract data if necessary, though this assumes the raw response is returned
        return (resp as any).data !== undefined ? (resp as any).data : resp;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

/* -------------------------------------------------------------------------- */
/*                         usePromptTemplates HOOK                            */
/* -------------------------------------------------------------------------- */
export function usePromptTemplates(includeArchived: boolean = false) {
    // The list key for this hook
    const cacheKey = `/templates?include_archived=${includeArchived}`;
    
    const { data, error, isLoading } = useSWR(cacheKey, fetcher, {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
    });

    /* ---------------------------------------------------------------------- */
    /*                              CREATE                                    */
    /* ---------------------------------------------------------------------- */
    const createTemplate = async (templateData: PromptTemplateCreate) => {
        try {
            const newTemplate = await apiClient.post<PromptTemplate>(
                '/templates',
                templateData
            );
            
            // 1. Optimistic update for the template list
            await mutate(
                cacheKey, 
                (currentData: PromptTemplate[] = []) => [newTemplate, ...currentData],
                { revalidate: false } 
            );
            
            // 2. **FIX**: Tell the Recent Activity widget to re-fetch
            mutate(RECENT_ACTIVITY_CACHE_KEY);

            toast.success('Template saved instantly!');
            return newTemplate;
        } catch (err: any) {
            console.error('Failed to create template:', err);
            toast.error('Save failed');
            throw new Error('Failed to create template.');
        }
    };

    /* ---------------------------------------------------------------------- */
    /*                              DELETE                                    */
    /* ---------------------------------------------------------------------- */
    const deleteTemplate = async (templateId: string) => {
        try {
            await apiClient.delete(`/templates/${templateId}`);
            
            // 1. Optimistic update for the template list
            await mutate(
                cacheKey,
                (currentData: PromptTemplate[] = []) =>
                    currentData.filter((t) => t.id !== templateId),
                { revalidate: false } 
            );
            
            // 2. **FIX**: Also mutate recent activity
            mutate(RECENT_ACTIVITY_CACHE_KEY);

            toast.success('Template deleted');
        } catch (err: any) {
            console.error('Failed to delete template:', err);
            toast.error('Failed to delete template');
            throw new Error('Failed to delete template.');
        }
    };

    /* ---------------------------------------------------------------------- */
    /*                              ARCHIVE                                   */
    /* ---------------------------------------------------------------------- */
    const archiveTemplate = async (templateId: string, isArchived: boolean) => {
        try {
            const updateData = { is_archived: isArchived };
            const updatedTemplate = await apiClient.patch<PromptTemplate>(
                `/templates/${templateId}`,
                updateData
            );
            
            // 1. Optimistic update for the template list
            await mutate(
                cacheKey,
                (currentData: PromptTemplate[] = []) =>
                    currentData.map((t) =>
                        t.id === templateId ? updatedTemplate : t
                    ),
                { revalidate: false } 
            );
            
            // 2. **FIX**: Also mutate recent activity
            mutate(RECENT_ACTIVITY_CACHE_KEY);

            toast.success(isArchived ? 'Template archived' : 'Template unarchived');
            return updatedTemplate;
        } catch (err: any) {
            console.error('Failed to archive template:', err);
            toast.error(`Failed to ${isArchived ? 'archive' : 'unarchive'} template`);
            throw new Error(
                `Failed to ${isArchived ? 'archive' : 'unarchive'} template.`
            );
        }
    };
    
    /* ---------------------------------------------------------------------- */
    /*                                COPY                                    */
    /* ---------------------------------------------------------------------- */
    const copyTemplate = async (templateId: string) => {
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
                // Assuming 'content' field in template types
                content: (templateToCopy as any).content, 
                tags: (templateToCopy as any).tags,
            };

            const newTemplate = await apiClient.post<PromptTemplate>(
                '/templates',
                newTemplateData
            );
            
            // 1. Optimistic update for the template list
            await mutate(cacheKey, (currentData: PromptTemplate[] = []) => [
                newTemplate,
                ...currentData,
            ]);

            // 2. **FIX**: Also mutate recent activity
            mutate(RECENT_ACTIVITY_CACHE_KEY);

            toast.success('Template copied!');
            return newTemplate;
        } catch (err: any) {
            console.error('Failed to copy template:', err);
            toast.error(err.message || 'Failed to copy template');
            throw new Error(err.message || 'Failed to copy template.');
        }
    };

    /* ---------------------------------------------------------------------- */
    /*                               RETURN API                                 */
    /* ---------------------------------------------------------------------- */
    return {
        templates: data ?? [],
        isLoading,
        isError: error,
        createTemplate,
        deleteTemplate,
        archiveTemplate,
        copyTemplate, 
    };
}

/* -------------------------------------------------------------------------- */
/*                         useTemplateDetail HOOK                             */
/* -------------------------------------------------------------------------- */
export function useTemplateDetail(templateId: string | null) {
    const { user } = useAuth();
    const userId = user?.uid; // Used for SWR key dependency

    // SWR key includes userId for proper cache separation between users
    const endpoint = `/templates/${templateId}`;
    const key = templateId && userId ? [endpoint, userId] : null;

    const { data, error, isLoading, mutate } = useSWR<PromptTemplate | null>(key, singleTemplateFetcher);

    return {
        template: data,
        isLoading: !error && !data && !!key,
        isError: error,
        mutate,
    };
}
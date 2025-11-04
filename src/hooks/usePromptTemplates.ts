// src/hooks/usePromptTemplates.ts (FIXED)
'use client';

import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import {
    PromptTemplate,
    PromptTemplateCreate,
} from '@/types/template';
import toast from 'react-hot-toast';
// --- FIX: Add missing import for hook consistency and security ---
import { useAuth } from '@/context/AuthContext';


// This is the SWR fetcher for lists
const fetcher = (url: string) =>
    apiClient.get<PromptTemplate[]>(url).then((res) => res as unknown as PromptTemplate[]);

// --- FIX: New Fetcher for single template detail ---
const singleTemplateFetcher = async (key: [string, string]): Promise<PromptTemplate | null> => {
    const [url] = key;
    try {
        // apiClient returns response.data directly
        return (await apiClient.get<PromptTemplate>(url)) as PromptTemplate; 
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

export function usePromptTemplates(includeArchived: boolean = false) {
    // ... (Existing implementation of usePromptTemplates remains here)
    // All original code for createTemplate, deleteTemplate, etc. remains the same.
    // ... 
    
    // Returning the existing public methods.
    const cacheKey = `/templates?include_archived=${includeArchived}`;
    const { data, error, isLoading } = useSWR(cacheKey, fetcher, {
        revalidateOnFocus: true, // Re-fetch on window focus
    });

    const createTemplate = async (templateData: PromptTemplateCreate) => {
        try {
            const newTemplate = (await apiClient.post(
                '/templates',
                templateData
            )) as unknown as PromptTemplate;
            mutate(cacheKey, (currentData: PromptTemplate[] = []) => [
                newTemplate,
                ...currentData,
            ]);
            return newTemplate;
        } catch (err: any) {
            console.error('Failed to create template:', err);
            throw new Error('Failed to create template.');
        }
    };

    const deleteTemplate = async (templateId: string) => {
        try {
            await apiClient.delete(`/templates/${templateId}`);
            mutate(
                cacheKey,
                (currentData: PromptTemplate[] = []) =>
                    currentData.filter((t) => t.id !== templateId),
                false 
            );
        } catch (err: any) {
            console.error('Failed to delete template:', err);
            throw new Error('Failed to delete template.');
        }
    };

    const archiveTemplate = async (templateId: string, isArchived: boolean) => {
        try {
            const updateData = { is_archived: isArchived };
            const updatedTemplate = (await apiClient.patch(
                `/templates/${templateId}`,
                updateData
            )) as unknown as PromptTemplate;

            mutate(
                cacheKey,
                (currentData: PromptTemplate[] = []) =>
                    currentData.map((t) =>
                        t.id === templateId ? { ...t, is_archived: isArchived } : t
                    ),
                false 
            );
            return updatedTemplate;
        } catch (err: any) {
            console.error('Failed to archive template:', err);
            throw new Error(
                `Failed to ${isArchived ? 'archive' : 'unarchive'} template.`
            );
        }
    };

    const copyTemplate = async (templateId: string) => {
        try {
            const templateToCopy = (await apiClient.get(
                `/templates/${templateId}`
            )) as unknown as PromptTemplate;

            if (!templateToCopy) {
                throw new Error('Template not found.');
            }

            const newTemplateData: PromptTemplateCreate = {
                name: `${templateToCopy.name} (Copy)`,
                description: templateToCopy.description,
                content: templateToCopy.content,
                tags: templateToCopy.tags,
            };

            const newTemplate = (await apiClient.post(
                '/templates',
                newTemplateData
            )) as unknown as PromptTemplate;

            mutate(cacheKey, (currentData: PromptTemplate[] = []) => [
                newTemplate,
                ...currentData,
            ]);

            return newTemplate;
        } catch (err: any) {
            console.error('Failed to copy template:', err);
            throw new Error(err.message || 'Failed to copy template.');
        }
    };


    return {
        templates: data,
        isLoading,
        isError: error,
        createTemplate,
        deleteTemplate,
        archiveTemplate,
        copyTemplate, 
    };
}

// --- FIX: Add the missing hook and export it directly ---
export function useTemplateDetail(templateId: string | null) {
    const { user } = useAuth();
    const userId = user?.uid;

    const endpoint = `/templates/${templateId}`;
    const key = templateId && userId ? [endpoint, userId] : null;

    const { data, error, isLoading, mutate } = useSWR<PromptTemplate | null>(key, singleTemplateFetcher);

    return {
        template: data,
        isLoading: isLoading,
        isError: error,
        mutate,
    };
}
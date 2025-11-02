// src/hooks/usePromptTemplates.ts
'use client';

import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
// --- V-- THIS IS THE FIX (STEP 2 of 2) --V ---
import {
    PromptTemplate,
    PromptTemplateCreate, // Now we can import this
} from '@/types/template';
// --- ^-- END OF FIX --^ ---
import toast from 'react-hot-toast';

// This is the SWR fetcher
const fetcher = (url: string) =>
    apiClient.get<PromptTemplate[]>(url).then((res) => res as unknown as PromptTemplate[]);

export function usePromptTemplates(includeArchived: boolean = false) {
    const cacheKey = `/templates?include_archived=${includeArchived}`;
    const { data, error, isLoading } = useSWR(cacheKey, fetcher, {
        revalidateOnFocus: true, // Re-fetch on window focus
    });

    // Use the correct 'PromptTemplateCreate' type
    const createTemplate = async (templateData: PromptTemplateCreate) => {
        try {
            const newTemplate = (await apiClient.post(
                '/templates',
                templateData
            )) as unknown as PromptTemplate;
            // Mutate the cache to add the new template immediately
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
            // Mutate the cache to remove the template
            mutate(
                cacheKey,
                (currentData: PromptTemplate[] = []) =>
                    currentData.filter((t) => t.id !== templateId),
                false // Don't revalidate immediately
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

            // Update the cache
            mutate(
                cacheKey,
                (currentData: PromptTemplate[] = []) =>
                    currentData.map((t) =>
                        t.id === templateId ? { ...t, is_archived: isArchived } : t
                    ),
                false // Don't revalidate immediately
            );
            return updatedTemplate;
        } catch (err: any) {
            console.error('Failed to archive template:', err);
            throw new Error(
                `Failed to ${isArchived ? 'archive' : 'unarchive'} template.`
            );
        }
    };

    // --- V-- THIS IS THE FIX (STEP 2 of 2) --V ---
    const copyTemplate = async (templateId: string) => {
        // The old implementation called a non-existent '/copy' endpoint.
        // The correct logic is to GET the template's data and POST it to
        // the create endpoint.

        try {
            // 1. GET the data for the template we want to copy
            const templateToCopy = (await apiClient.get(
                `/templates/${templateId}`
            )) as unknown as PromptTemplate;

            if (!templateToCopy) {
                throw new Error('Template not found.');
            }

            // 2. Create a new "Create" object based on its data
            const newTemplateData: PromptTemplateCreate = {
                name: `${templateToCopy.name} (Copy)`, // Append (Copy)
                description: templateToCopy.description,
                content: templateToCopy.content,
                tags: templateToCopy.tags,
            };

            // 3. POST to the standard create endpoint
            const newTemplate = (await apiClient.post(
                '/templates',
                newTemplateData
            )) as unknown as PromptTemplate;

            // 4. Mutate the cache to add the new template to the top
            mutate(cacheKey, (currentData: PromptTemplate[] = []) => [
                newTemplate,
                ...currentData,
            ]);

            return newTemplate;
        } catch (err: any) {
            console.error('Failed to copy template:', err);
            // Re-throw the error so the toast.promise in the UI can catch it
            throw new Error(err.message || 'Failed to copy template.');
        }
    };
    // --- ^-- END OF FIX --^ ---

    return {
        templates: data,
        isLoading,
        isError: error,
        createTemplate,
        deleteTemplate,
        archiveTemplate,
        copyTemplate, // This function is now fixed
    };
}
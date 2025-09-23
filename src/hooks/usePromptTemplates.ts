// src/hooks/usePromptTemplates.ts
'use client';

import useSWR from 'swr';
import { authenticatedFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

interface Template {
  id: string;
  name: string;
  description: string;
  template_text: string;
  is_archived: boolean;
  created_at: string;
  tags: string[]; // Add the missing tags property
}

const fetcher = (url: string): Promise<Template[]> => authenticatedFetch(url);

export const usePromptTemplates = () => {
  const { user } = useAuth();
  const swrKey = user ? '/templates' : null;
  const { data, error, isLoading, mutate } = useSWR<Template[]>(swrKey, fetcher);

  const createTemplate = async (templateData: { name: string; description: string; template_text: string; }) => {
    const newTemplate = await authenticatedFetch('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
    mutate((currentTemplates = []) => [newTemplate, ...currentTemplates], false);
    return newTemplate;
  };

  return {
    templates: data || [],
    isLoading,
    error,
    createTemplate,
    mutate,
  };
};
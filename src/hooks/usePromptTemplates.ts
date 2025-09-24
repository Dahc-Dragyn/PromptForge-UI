// src/hooks/usePromptTemplates.ts
'use client';

import useSWR from 'swr';
// FIX: Change this import from '@/lib/api' to the correct '@/lib/apiClient'
import { authenticatedFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

interface Template {
  id: string;
  name: string;
  description: string;
  template_text: string;
  is_archived: boolean;
  created_at: string;
  tags: string[];
}

export const usePromptTemplates = () => {
  const { user } = useAuth();
  const swrKey = user ? '/templates' : null;
  const { data, error, isLoading, mutate } = useSWR<Template[]>(swrKey, authenticatedFetch);

  const createTemplate = async (templateData: { name: string; description: string; template_text: string; }) => {
    const newTemplate = await authenticatedFetch('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
    mutate();
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
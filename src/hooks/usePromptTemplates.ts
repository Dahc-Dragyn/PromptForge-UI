// src/hooks/usePromptTemplates.ts
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/apiClient';

export const usePromptTemplates = (showArchived = false) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) {
        setLoading(false);
        setTemplates([]);
        return;
      }

      setLoading(true);
      try {
        const data = await apiClient('/templates/');
        
        if (data && Array.isArray(data)) {
            let templateData = data;
            if (!showArchived) {
                templateData = templateData.filter((t: any) => !t.isArchived);
            }
            setTemplates(templateData);
        } else {
            setTemplates([]);
        }
      } catch (error) {
        console.error('Failed to fetch prompt templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [user, showArchived]);

  return { templates, loading };
};
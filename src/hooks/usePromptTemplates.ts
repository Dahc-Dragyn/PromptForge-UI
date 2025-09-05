// src/hooks/usePromptTemplates.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const usePromptTemplates = (showArchived = false) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // --- FIX: Remove the 'where' clause to fetch ALL documents ---
    // We will filter on the client-side to handle documents without the 'isArchived' field.
    const q = query(collection(db, 'prompt_templates'), orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let templatesData: any[] = [];
      querySnapshot.forEach((doc) => {
        templatesData.push({ id: doc.id, ...doc.data() });
      });

      // --- FIX: Apply filtering on the client-side ---
      if (!showArchived) {
        templatesData = templatesData.filter(template => !template.isArchived);
      }
      
      setTemplates(templatesData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Failed to fetch templates:", err);
      setError('Failed to fetch prompt templates in real-time.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showArchived]);

  return { templates, loading, error };
};
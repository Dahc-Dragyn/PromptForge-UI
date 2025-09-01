// src/hooks/usePromptTemplates.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const usePromptTemplates = () => {
  // --- THIS IS THE FIX ---
  // We explicitly tell useState that it will be an array of 'any' type.
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'prompt_templates'), orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const templatesData: any[] = [];
      querySnapshot.forEach((doc) => {
        templatesData.push({ id: doc.id, ...doc.data() });
      });
      setTemplates(templatesData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Failed to fetch templates:", err);
      setError('Failed to fetch prompt templates in real-time.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { templates, loading, error };
};
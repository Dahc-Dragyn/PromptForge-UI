// src/hooks/usePrompts.ts
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export const usePrompts = (showArchived = false) => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setPrompts([]);
      return;
    }

    // FIX: The query now uses 'owner_id' to match the updated backend schema.
    const q = query(
      collection(db, 'prompts'), 
      where('owner_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let promptsData: any[] = [];
      querySnapshot.forEach((doc) => {
        promptsData.push({ id: doc.id, ...doc.data() });
      });

      // Client-side filtering for the "Show Archived" toggle remains.
      if (!showArchived) {
        promptsData = promptsData.filter(p => !p.isArchived);
      }
      
      setPrompts(promptsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Failed to fetch prompts:", err);
      setError('Failed to fetch prompts in real-time.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showArchived, user]);

  return { prompts, loading, error };
};
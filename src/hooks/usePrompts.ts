// src/hooks/usePrompts.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/`;

// --- NEW: Add a prop to control whether archived items are shown ---
export const usePrompts = (showArchived = false) => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      setError(null);
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}.`);
      }
      
      let data = await response.json();
      
      // --- MODIFIED: Conditionally filter out archived prompts on the client-side ---
      if (!showArchived) {
        data = data.filter((p: any) => !p.isArchived);
      }

      data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPrompts(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch prompts:', err);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [showArchived]); // --- NEW: Add showArchived as a dependency ---

  useEffect(() => {
    fetchPrompts(true);
    const interval = setInterval(() => fetchPrompts(false), 30000);
    return () => clearInterval(interval);
  }, [fetchPrompts]);

  return { prompts, loading, error, refetch: () => fetchPrompts(false) };
};
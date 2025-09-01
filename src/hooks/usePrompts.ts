// src/hooks/usePrompts.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/`;

export const usePrompts = () => {
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
      
      const data = await response.json();
      setPrompts(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch prompts:', err);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts(true);
    const interval = setInterval(() => fetchPrompts(false), 30000);
    return () => clearInterval(interval);
  }, [fetchPrompts]);

  return { prompts, loading, error, refetch: () => fetchPrompts(false) };
};
'use client';

import React, { ReactNode, useCallback } from 'react';
import { SWRConfig, Fetcher } from 'swr';
import { useAuth } from '@/context/AuthContext';
import Navbar from './Navbar';

interface AppCacheProviderProps {
  children: ReactNode;
}

export const AppCacheProvider = ({ children }: AppCacheProviderProps) => {
  const { user, loading, getToken } = useAuth();
  const sessionKey = user?.uid || 'anonymous';

  const secureFetcher: Fetcher<any, string> = useCallback(
    async (url: string) => {
      const { apiClient } = await import('@/lib/apiClient');
      const token = await getToken();
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };
      try {
        return await apiClient.get(url, config);
      } catch (error: any) {
        const err = new Error(error.response?.data?.detail || 'An API error occurred.');
        (err as any).status = error.response?.status;
        throw err;
      }
    },
    [getToken]
  );

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        Loading Application...
      </div>
    );
  }

  return (
    // This SWRConfig provides the cache context but renders no HTML itself.
    <SWRConfig
      key={sessionKey}
      value={{
        provider: () => new Map(),
        fetcher: secureFetcher,
      }}
    >
      {/* 1. This is the single, top-level container for the entire visual layout. */}
      {/* It forces the layout to be at least the full height of the screen. */}
      <div className="flex flex-col min-h-screen">
        <Navbar />
        {/* 2. DEFINITIVE FIX: The 'container' and 'mx-auto' classes are GONE. */}
        {/* The 'flex-grow' class makes this main section fill all available space. */}
        {/* The 'p-4' class adds padding so the content doesn't touch the screen edges. */}
        <main className="flex-grow p-4">
          {children}
        </main>
      </div>
    </SWRConfig>
  );
};
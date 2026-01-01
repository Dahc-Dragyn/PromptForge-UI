// src/components/AppCacheProvider.tsx
'use client';

import { SWRConfig } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import React from 'react';

// Define the expected shape of the key array
type SWRKey = [string, string] | string;

// Update the fetcher to handle the array key
const fetcher = async (key: SWRKey) => {
  // Extract the URL whether the key is a string or an array
  const url = Array.isArray(key) ? key[0] : key;
  // Make the API call with the extracted URL
  return apiClient.get(url);
};


const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        // Use the corrected fetcher function
        fetcher: fetcher,
        revalidateOnFocus: false,
      }}
    >
      {children}
    </SWRConfig>
  );
};

export const AppCacheProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const cacheKey = loading ? 'loading' : user?.uid || 'logged-out';

  return <SWRProvider key={cacheKey}>{children}</SWRProvider>;
};
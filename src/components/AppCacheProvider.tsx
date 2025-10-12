// src/components/AppCacheProvider.tsx
'use client';

import { SWRConfig } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import React from 'react';

// This component acts as a "reset" boundary for SWR's cache.
// When the `key` prop changes, React will unmount the old component
// and its children, destroying the old cache and creating a new one.
const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => apiClient.get(url),
        revalidateOnFocus: false,
      }}
    >
      {children}
    </SWRConfig>
  );
};

// This is the main component we will use in our layout.
// It gets the user from the AuthContext.
export const AppCacheProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // We generate a key that is stable for a given user session but
  // changes when the user logs in or out.
  // While loading, we can use a null key. When a user logs in, `user.uid`
  // becomes the key, forcing a re-mount. When they log out, it goes back
  // to null, forcing another re-mount.
  const cacheKey = loading ? null : user?.uid || null;

  return <SWRProvider key={cacheKey}>{children}</SWRProvider>;
};
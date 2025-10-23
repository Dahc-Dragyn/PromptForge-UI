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
        // Use our configured apiClient as the global fetcher
        fetcher: (url: string) => apiClient.get(url),
        // Sensible defaults - adjust if needed, but disable focus revalidation for now
        revalidateOnFocus: false,
        // Optional: Add global error handling or other SWR options here
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
  // While loading, we use 'loading'. When a user logs in, `user.uid`
  // becomes the key, forcing a re-mount. When they log out, it goes back
  // to 'logged-out', forcing another re-mount. This *guarantees* cache isolation.
  const cacheKey = loading ? 'loading' : user?.uid || 'logged-out';

  // The key prop on SWRProvider ensures the entire SWR context is reset
  // when the authentication state changes.
  return <SWRProvider key={cacheKey}>{children}</SWRProvider>;
};
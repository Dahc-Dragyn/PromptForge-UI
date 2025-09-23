// src/hooks/useRecentActivity.ts
'use client';

import useSWR from 'swr';
import { authenticatedFetch } from '@/lib/apiClient'; // Corrected named import
import { useAuth } from '@/context/AuthContext';

// Define a type for the activity log for type safety.
interface ActivityLog {
  id: string;
  timestamp: string; // Assuming ISO string format from the backend
  activity_type: string;
  user_name: string;
  details: string;
}

const fetcher = (url: string): Promise<ActivityLog[]> => authenticatedFetch(url);

export const useRecentActivity = () => {
  const { user } = useAuth();
  
  // The SWR key is the API endpoint. It will only fetch if the user is logged in.
  const swrKey = user ? '/metrics/activity/recent' : null;
  
  const { data, error, isLoading } = useSWR<ActivityLog[]>(swrKey, fetcher, {
    // Optional: Re-fetch activity every 5 minutes
    refreshInterval: 300000, 
  });

  return {
    activity: data || [],
    isLoading,
    error,
  };
};
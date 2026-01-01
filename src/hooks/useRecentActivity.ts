'use client';
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { ActivityItem } from '@/types/prompt'; // Import the UI type

// FIX: REMOVED trailing slash. This prevents the 307 Redirect to HTTP.
const RECENT_ACTIVITY_ENDPOINT_BASE = '/metrics/activity/recent';

// Type for the raw API response
interface ApiActivity {
  id: string;
  activity_type: string; // API uses this name
  prompt_name: string;
  timestamp: string;
  prompt_id: string;
}

/**
 * FIX: Export a function to generate the user-aware cache key.
 * This is the "key" we will use in the save hooks for mutation.
 * @param limit The number of items to fetch.
 * @param userId The ID of the authenticated user.
 * @returns The SWR array cache key, or null if the user is not logged in.
 */
export const getRecentActivityCacheKey = (limit: number, userId?: string | null): [string, string] | null => {
  // Result will look like: "/metrics/activity/recent?limit=10" (No slash before ?)
  const endpoint = `${RECENT_ACTIVITY_ENDPOINT_BASE}?limit=${limit}`;
  return userId ? [endpoint, userId] : null;
};


// Custom fetcher to map API response to UI type
const fetcher = async (key: [string, string]): Promise<ActivityItem[]> => {
  const [url] = key; // Extract URL from the array key
  const apiData = (await apiClient.get(url)) as ApiActivity[];
  // Map 'activity_type' to 'action'
  return (apiData || []).map(item => ({
    ...item,
    action: item.activity_type, // Rename the field
  }));
};

export function useRecentActivity(limit: number = 10) {
  const { user } = useAuth();
  const userId = user?.uid;

  // Use the exported helper function to get the correct cache key
  const key = getRecentActivityCacheKey(limit, userId);

  // Use the custom fetcher and the correct return type
  const { data, error } = useSWR<ActivityItem[]>(key, fetcher);

  return {
    activities: data,
    isLoading: !error && !data && !!userId,
    isError: error,
  };
}